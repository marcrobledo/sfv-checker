/*
* SFV Checker
* A web app that calculates and checks CRC32, MD5 or SHA1 file integrities.
* (last update: 2025-06-20)
* By Marc Robledo https://www.marcrobledo.com
*
* License:
*
* MIT License
* 
* Copyright (c) 2016-2025 Marc Robledo
* 
* Permission is hereby granted, free of charge, to any person obtaining a copy
* of this software and associated documentation files (the "Software"), to deal
* in the Software without restriction, including without limitation the rights
* to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
* copies of the Software, and to permit persons to whom the Software is
* furnished to do so, subject to the following conditions:
* 
* The above copyright notice and this permission notice shall be included in all
* copies or substantial portions of the Software.
* 
* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
* IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
* FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
* AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
* LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
* OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
* SOFTWARE.
*/

if(typeof window.FileReader!=='function' || typeof window.Worker!=='function'){
	alert('Your browser is outdated and not compatible with this app.');
	throw new Error('Incompatible browser');
}




const MODE_CRC32=0;
const MODE_MD5=1;
const MODE_SHA1=2;

const STATUS_PENDING=0;
const STATUS_CALCULATING=1;

const MODES=[
	{
		title:'CRC32',
		listExtension:'sfv',
		regex:/^[ \t]*([^;].*?) +([0-9a-fA-F]{8})$/,
		hashLength: 8,
		hashColumn: 1
	},{
		title:'MD5',
		listExtension:'md5',
		regex:/^([0-9a-fA-F]{32}) [ \*](.+)$/, /* MD5 asterisk determines binary mode instead of text, usually not used */
		hashLength: 32,
		hashColumn: 0
	},{
		title:'SHA1',
		listExtension:'sha1',
		regex:/^([0-9a-fA-F]{40}) [ \*](.+)$/, /* SHA1 */
		hashLength: 40,
		hashColumn: 0
	}
];



/* service worker */
const FORCE_HTTPS=true;
if(FORCE_HTTPS && location.protocol==='http:')
	location.href=window.location.href.replace('http:','https:');
else if(location.protocol==='https:' && 'serviceWorker' in navigator)
	navigator.serviceWorker.register('/sfv-checker/_cache_service_worker.js', {scope: '/sfv-checker/'});


var filesByName={};
var isHashing=false;

/* Web Worker */
const webWorker=new Worker('./app/web_worker.js');
webWorker.onmessage=function(event){
	if(event.data.result){
		isHashing=false;
		filesByName[event.data.fileName].setChecksum(event.data.mode, event.data.result);

		hashNextFile();
	}
};





function getMode(){
	return parseInt(document.getElementById('select-mode').value);
}
function setMode(newMode){
	const className=MODES[newMode].title.toLowerCase();

	if(newMode===MODE_CRC32){
		document.getElementById('mobile-header-chrome').content='#83db88';
		document.getElementById('mobile-header-safari').content='#83db88';
	}else if(newMode===MODE_MD5){
		document.getElementById('mobile-header-chrome').content='#f78572';
		document.getElementById('mobile-header-safari').content='#f78572';
	}else if(newMode===MODE_SHA1){
		document.getElementById('mobile-header-chrome').content='#8ad9ee';
		document.getElementById('mobile-header-safari').content='#8ad9ee';
	}
	
	/* refresh empty message */
	TranslateUI.translateElement(document.getElementById('message').children[0], MODES[getMode()].title);

	TranslateUI.translateElement(document.getElementById('button-export').children[1], MODES[getMode()].listExtension);
	document.getElementById('logo').src='./app/resources/logo192_'+className+'.png';
	document.body.className=className;
	var links=document.getElementsByTagName('link');
	for(var i=0; i<links.length; i++){
		if(links[i].rel==='shortcut icon'){
			if(links[i].sizes.toString()==='16x16')
				links[i].href='./app/resources/favicon_'+className+'.png';
			//else if(links[i].sizes.toString()==='192x192')
			//	links[i].href='./logo192_'+className+'.png';
		}
	}
	

	for(var fileName in filesByName){
		filesByName[fileName].refreshRow(newMode);
	}

	SFVCheckerSettings.defaultMode=newMode;

	refreshWrapper();
}
function refreshWrapper(){
	if(Object.keys(filesByName).length){
		document.getElementById('button-export').className='';
		document.getElementById('button-delete').className='';
		document.getElementById('tbody').parentElement.style.display='table';
		document.getElementById('message').style.display='none';
	}else{
		document.getElementById('button-export').className='hide';
		document.getElementById('button-delete').className='hide';
		document.getElementById('tbody').parentElement.style.display='none';
		document.getElementById('message').style.display='block';
	}
}

function addFile(fileName, file){
	if(filesByName[fileName]){
		if(file)
			filesByName[fileName].file=file;
		return filesByName[fileName];
	}else{
		return filesByName[fileName]=new SFVFile(fileName, file);
	}
}


function readFile(file, mode){
	isHashing=file;

	file.setCalculating(mode);
	
	var fileReader=new FileReader();
	fileReader.addEventListener('load',function(evt){
		if(mode===MODE_CRC32 || mode===MODE_MD5){
			var u8array=new Uint8Array(evt.target.result);
			webWorker.postMessage({fileName:file.fileName, u8array:u8array, mode:mode}, [u8array.buffer]);
		}else{
			HasherSHA1.hash(evt.target.result, file);
		}
	},false);

	fileReader.readAsArrayBuffer(file.file);
}

function hashNextFile(){
	if(isHashing)
		return false;

	var mode=getMode();
	for(var fileName in filesByName){
		var sfvFile=filesByName[fileName];
		if(sfvFile.checksums[mode]===STATUS_CALCULATING){
			return false;
		}else if(sfvFile.file && sfvFile.checksums[mode]===STATUS_PENDING){
			readFile(sfvFile, getMode());
			return sfvFile;
		}
	}
	return false;
}





function clearList(){
	filesByName={};
	document.getElementById('tbody').innerHTML='';
	if(isHashing){
		filesByName[isHashing.fileName]=isHashing;
		document.getElementById('tbody').appendChild(isHashing.tr);
	}
	refreshWrapper();
}


function SFVFile(fileName, file){
	this.fileName=fileName;

	this.tr=document.createElement('tr');
	this.tr.appendChild(document.createElement('td'));
	this.tr.appendChild(document.createElement('td'));
	this.tr.children[0].innerHTML=fileName;
	
	this.checksums=new Array(MODES.length);
	this.checksumsValid=new Array(MODES.length);
	for(var i=0; i<MODES.length; i++){
		this.checksums[i]=STATUS_PENDING;
		this.checksumsValid[i]=false;
	}

	document.getElementById('tbody').appendChild(this.tr);

	
	if(file)
		this.file=file;
}
SFVFile.prototype.setChecksum=function(mode, newChecksum){this.checksums[mode]=newChecksum;this.refreshRow(mode)}
SFVFile.prototype.setChecksumValid=function(mode, newChecksum){this.checksumsValid[mode]=newChecksum;this.refreshRow(mode)}

SFVFile.prototype.copyHashToClipboard=function(mode){
	MarcClipboard.copy(this.checksums[mode]);
};
SFVFile.prototype.setCalculating=function(mode){
	this.checksums[mode]=STATUS_CALCULATING;
	this.refreshRow(mode);
};
SFVFile.prototype.refreshRow=function(mode){
	if(getMode()===mode){
		if(this.checksums[mode]===STATUS_PENDING){
			this.tr.children[1].innerHTML=this.checksumsValid[mode]? '<span class="hash">'+this.checksumsValid[mode]+'</span>' : '?';
			this.tr.className='';
		}else if(this.checksums[mode]===STATUS_CALCULATING){
			this.tr.children[1].innerHTML='<span class="calculating">'+_('Calculating')+'...</span>';
			this.tr.className='';
		}else if(this.checksumsValid[mode]){
			if(this.checksums[mode]===this.checksumsValid[mode]){
				this.tr.children[1].innerHTML='';
				this.tr.children[1].appendChild(createCopiableHashSpan(this, mode));
				this.tr.className='verified verified-'+TranslateUI.getCurrentLanguage();
			}else{
				this.tr.children[1].innerHTML='<span class="hash invalid">'+this.checksums[mode]+'</span><br/><span class="hash">'+this.checksumsValid[mode]+'</span>';
				this.tr.className='error error-'+TrasnlateUI.getCurrentLanguage();
			}
		}else{
			if(this.checksums[mode]){
				this.tr.children[1].innerHTML='';
				this.tr.children[1].appendChild(createCopiableHashSpan(this, mode));
			}else{
				this.tr.children[1].innerHTML='?';
			}
			this.tr.className='';
		}
	}
}


function createCopiableHashSpan(sfvFile, mode){
	var span=document.createElement('span');
	span.className='hash clickable';
	span.innerHTML=sfvFile.checksums[mode];
	span.addEventListener('click', function(evt){
		sfvFile.copyHashToClipboard(mode);
		sfvFile.tr.children[1].innerHTML=_('Hash copied to clipboard');
		window.setTimeout(function(){
			if(getMode()===mode)
				sfvFile.refreshRow(mode);
		}, 1000);
	});
	return span;
}


/* MarcClipboard */
var MarcClipboard=(function(){
	var fakeInput=document.createElement('input');
	fakeInput.style.position='fixed';
	fakeInput.style.top='0';
	fakeInput.style.left='0';

	var defaultOnError=function(){
		console.error('couldn\'t copy to clipboard');
	};

	return{
		copy:function(str, onCopy, onError){
			onError=onError || defaultOnError;

			if(typeof navigator.clipboard!=='undefined'){
				navigator.clipboard.writeText(str).then(onCopy, onError);

			}else{ //fallback
				fakeInput.value=str;
				document.body.appendChild(fakeInput);
				fakeInput.focus();
				fakeInput.select();

				try{
					if(document.execCommand('copy')){
						if(onCopy)
							onCopy.call();
					}else{
						onError.call();
					}
				}catch(err){
					onError.call();
				}

				document.body.removeChild(fakeInput);
			}
		}
	}
}());











/* settings */
var SFVCheckerSettings=(function(){
	var IS_STORAGE_AVAILABLE=(typeof(Storage)!=='undefined');

	return{
		/* default settings */
		defaultMode:MODE_MD5,

		get:function(){
			return{
				defaultMode:this.defaultMode
			}
		},
		save:function(){
			if(IS_STORAGE_AVAILABLE){
				localStorage.setItem('sfv-checker', JSON.stringify(this));
			}
		},
		load:function(){
			if(IS_STORAGE_AVAILABLE && localStorage.getItem('sfv-checker')){
				var loadedSettings=JSON.parse(localStorage.getItem('sfv-checker'));

				if(typeof loadedSettings.defaultMode==='number' && (loadedSettings.defaultMode===MODE_CRC32 || loadedSettings.defaultMode===MODE_MD5 || loadedSettings.defaultMode===MODE_SHA1))
					this.defaultMode=loadedSettings.defaultMode;
					document.getElementById('select-mode').value=this.defaultMode;
			}
		},
		delete:function(){
			if(IS_STORAGE_AVAILABLE && localStorage.getItem('sfv-checker')){
				localStorage.removeItem('sfv-checker');
			}
		}
	}
}());




function parseFileList(file, mode){
	var fileReader=new FileReader();
	fileReader.addEventListener('load',function(){
		var lines=this.result.replace(/\r/g,'\n').replace(/\n+/g,'\n').split('\n');
		for(var i=0; i<lines.length; i++){
			let line=lines[i]
			if (!line) {
				continue
			}

			var match=formatFileHash(line, mode).match(MODES[mode].regex);
			if(match){
				if(mode===MODE_CRC32)
					addFile(match[1]).setChecksumValid(MODE_CRC32, match[2].toLowerCase());
				else
					addFile(match[2]).setChecksumValid(mode, match[1].toLowerCase());
			}
		}
		refreshWrapper();
	},false);

	setMode(mode);
	fileReader.readAsText(file);
}

function formatFileHash(line, mode) {
	const currentMode = MODES[mode];
	const splits = line.split(" ")

	const filenameColumn = currentMode.hashColumn === 0 ? 1 : 0;
	const filename = splits[filenameColumn]

	const hashColumn = currentMode.hashColumn
	const hash = splits[hashColumn].padStart(currentMode.hashLength, "0")

	return `${filename} ${hash}`
}









function exportFileList(mode){
	var str='';
	var extension='';
	if(mode===MODE_MD5){
		for(fileName in filesByName){
			var fileObj=filesByName[fileName];
			var md5=fileObj.checksums[MODE_MD5] || fileObj.checksumsValid[MODE_MD5] || false;
			if(md5)
				str+=md5+' *'+fileName+'\n';
		}
		extension='md5';
	}else if(mode===MODE_SHA1){
		for(fileName in filesByName){
			var fileObj=filesByName[fileName];
			var sha1=fileObj.checksums[MODE_SHA1] || fileObj.checksumsValid[MODE_SHA1] || false;
			if(sha1)
				str+=sha1+' *'+fileName+'\n';
		}
		extension='sha1';
	}else{
		var maxLen=0;
		for(fileName in filesByName){
			var fileObj=filesByName[fileName];
			var crc32=fileObj.checksums[MODE_CRC32] || fileObj.checksumsValid[MODE_CRC32] || false;
			if(crc32 && fileName.length>maxLen)
				maxLen=fileName.length;
		}
		//console.log(maxLen);
		for(fileName in filesByName){
			var fileObj=filesByName[fileName];
			var crc32=fileObj.checksums[MODE_CRC32] || fileObj.checksumsValid[MODE_CRC32] || false;
			if(crc32){
				str+=fileName+'  ';
				for(var i=0; i<maxLen-fileName.length; i++)
					str+=' ';
				str+=crc32+'\n';
			}
		}
		extension='sfv';
	}
	
	/*var ta=document.createElement('textarea');
	ta.innerHTML=str;
	document.body.appendChild(ta);*/
	
	if(str)
		saveAs(new Blob([str], {type: "text/plain;charset=utf-8"}), 'your_files.'+extension);
}
















/* initialize app */
window.addEventListener('load',function(){
	TranslateUI.addLanguages(LOCALES);

	document.getElementById('input-files').value='';

	/* UI events */
	document.getElementById('select-mode').addEventListener('change', function(){
		setMode(parseInt(this.value));
		SFVCheckerSettings.save();
		hashNextFile();
	});
	document.getElementById('button-add').addEventListener('click', function(){
		document.getElementById('input-files').click();
	});	
	document.getElementById('button-add-string').addEventListener('click', function(){
		const text=prompt(_('Type text to hash:'));
		if(text){
			const fileName=text+'.txt';
			const blob=new Blob([text], {type: 'text/plain'});
			const fakeFile=new File([blob], fileName);
			addFile(fileName, fakeFile);
			refreshWrapper();
			hashNextFile();
		}
	});	
	document.getElementById('button-export').addEventListener('click', function(){
		exportFileList(getMode());
	});
	document.getElementById('button-delete').addEventListener('click', function(){
		clearList();
	});
	
	document.getElementById('input-files').addEventListener('change', function(){
		parseInputFiles(this.files);
		document.getElementById('form').reset();
	});

	/* load settings and initialize app */
	SFVCheckerSettings.load();
	setMode(getMode());
	TranslateUI.translateAll();
});



















/*
* FileSaver.js
* A saveAs() FileSaver implementation.
*
* By Eli Grey, http://eligrey.com
*
* License : https://github.com/eligrey/FileSaver.js/blob/master/LICENSE.md (MIT)
* source  : http://purl.eligrey.com/github/FileSaver.js
*/
var _global="object"==typeof window&&window.window===window?window:"object"==typeof self&&self.self===self?self:"object"==typeof global&&global.global===global?global:this;function bom(a,b){return"undefined"==typeof b?b={autoBom:!1}:"object"!=typeof b&&(console.warn("Deprecated: Expected third argument to be a object"),b={autoBom:!b}),b.autoBom&&/^\s*(?:text\/\S*|application\/xml|\S*\/\S*\+xml)\s*;.*charset\s*=\s*utf-8/i.test(a.type)?new Blob([String.fromCharCode(65279),a],{type:a.type}):a}function download(a,b,c){var d=new XMLHttpRequest;d.open("GET",a),d.responseType="blob",d.onload=function(){saveAs(d.response,b,c)},d.onerror=function(){console.error("could not download file")},d.send()}function corsEnabled(a){var b=new XMLHttpRequest;b.open("HEAD",a,!1);try{b.send()}catch(a){}return 200<=b.status&&299>=b.status}function click(a){try{a.dispatchEvent(new MouseEvent("click"))}catch(c){var b=document.createEvent("MouseEvents");b.initMouseEvent("click",!0,!0,window,0,0,0,80,20,!1,!1,!1,!1,0,null),a.dispatchEvent(b)}}var isMacOSWebView=_global.navigator&&/Macintosh/.test(navigator.userAgent)&&/AppleWebKit/.test(navigator.userAgent)&&!/Safari/.test(navigator.userAgent),saveAs=_global.saveAs||("object"!=typeof window||window!==_global?function(){}:"download"in HTMLAnchorElement.prototype&&!isMacOSWebView?function(b,c,d){var e=_global.URL||_global.webkitURL,f=document.createElement("a");c=c||b.name||"download",f.download=c,f.rel="noopener","string"==typeof b?(f.href=b,f.origin===location.origin?click(f):corsEnabled(f.href)?download(b,c,d):click(f,f.target="_blank")):(f.href=e.createObjectURL(b),setTimeout(function(){e.revokeObjectURL(f.href)},4E4),setTimeout(function(){click(f)},0))}:"msSaveOrOpenBlob"in navigator?function(b,c,d){if(c=c||b.name||"download","string"!=typeof b)navigator.msSaveOrOpenBlob(bom(b,d),c);else if(corsEnabled(b))download(b,c,d);else{var e=document.createElement("a");e.href=b,e.target="_blank",setTimeout(function(){click(e)})}}:function(a,b,c,d){if(d=d||open("","_blank"),d&&(d.document.title=d.document.body.innerText="downloading..."),"string"==typeof a)return download(a,b,c);var e="application/octet-stream"===a.type,f=/constructor/i.test(_global.HTMLElement)||_global.safari,g=/CriOS\/[\d]+/.test(navigator.userAgent);if((g||e&&f||isMacOSWebView)&&"undefined"!=typeof FileReader){var h=new FileReader;h.onloadend=function(){var a=h.result;a=g?a:a.replace(/^data:[^;]*;/,"data:attachment/file;"),d?d.location.href=a:location=a,d=null},h.readAsDataURL(a)}else{var i=_global.URL||_global.webkitURL,j=i.createObjectURL(a);d?d.location=j:location.href=j,d=null,setTimeout(function(){i.revokeObjectURL(j)},4E4)}});_global.saveAs=saveAs.saveAs=saveAs;




function parseInputFiles(files){
	var newMode;
	for(var i=0; i<files.length; i++){
		if(/\.sfv$/i.test(files[i].name)){
			parseFileList(files[i], MODE_CRC32);
			newMode=MODE_CRC32;
		}else if(/\.md5$/i.test(files[i].name)){
			parseFileList(files[i], MODE_MD5);
			newMode=MODE_MD5;
		}else if(/\.sha1$/i.test(files[i].name)){
			parseFileList(files[i], MODE_SHA1);
			newMode=MODE_SHA1;
		}else{
			addFile(files[i].name, files[i]);
		}
	}
	if(typeof newMode==='number' && getMode()!==newMode){
		document.getElementById('select-mode').value=newMode;
		setMode(newMode);
	}
	hashNextFile();
	refreshWrapper();
}




/*
* Translate UI JS
* Lightweight library for webapp UI translations
* (last update: 2025-06-17)
* By Marc Robledo https://www.marcrobledo.com
*
* Released under MIT license, see the top of this file for details
*/
const TranslateUI=function(n){const r={};function o(e,t,a){if(r[t]&&r[t][e]?e=r[t][e]:r.default&&r.default[e]&&(e=r.default[e]),Array.isArray(a))for(var n=0;n<a.length;n++)e=e.replace(new RegExp("%"+(n+1),"g"),a[n]);else a&&(e=e.replace(/%[s1]/g,a));return e}function a(e,t){if("string"==typeof e&&(e=document.querySelector(e)),!e instanceof HTMLElement)return null;t&&(e._translateParams=t);var t="INPUT"===(a=e).tagNode&&"text"===a.type||"TEXTAREA"===a.tagNode?"placeholder":"innerHTML",a=e.getAttribute("data-translate");return"*"===a?(e.setAttribute("data-translate",e[t]),e[t]=o(e[t],g,e._translateParams)):e[t]=o(a,g,e._translateParams),e[t]}function u(){const e=document.querySelectorAll("*[data-translate]");return e.forEach(function(e,t){a(e,null)}),e}var g=n;return{addLanguage:function(e,t,a){if("object"!=typeof e)throw new TypeError("TranslateUI.addLanguage: locale parameter is not an object");if(void 0===t||"string"!=typeof t)t=n;else if("string"!=typeof t)throw new TypeError("TranslateUI.addLanguage: langCode parameter is not an string");return r[t]=e,a&&(g=t,u()),r},addLanguages:function(e,t){if("object"!=typeof e)throw new TypeError("TranslateUI.addLanguages: locales parameter is not an object");for(var a in t&&"string"!=typeof t&&(t=n),e)"object"==typeof e[a]&&this.addLanguage(e[a],a,t&&t===a);return r},setLanguage:function(e){return"string"!=typeof e&&(e=n),g=e,u(),r[e]},getCurrentLanguage:function(){return g},getBrowserLanguage:function(){return n},_:function(e,t,a){return o(e,"string"==typeof t?t:g,a)},translateElement:a,translateAll:u}}(navigator.language||navigator.userLanguage||navigator.browserLanguage||"en-US");
const _=TranslateUI._;

