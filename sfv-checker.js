/* sfv-checker.js v20191023 - Marc Robledo 2016-2019 - http://www.marcrobledo.com/license */
const COMPATIBLE_BROWSER=typeof window.FileReader==='function';
const CRC32=0;
const SFV=0;
const MD5=1;
const SHA1=2;

const MODES=[
	{
		title:'CRC32',
		listExtension:'sfv',
		regex:/^[ \t]*([^;].*?) +([0-9a-fA-F]{8})$/
	},{
		title:'MD5',
		listExtension:'md5',
		regex:/^([0-9a-fA-F]{32}) [ \*](.+)$/, /* MD5 asterisk determines binary mode instead of text, usually not used */
	},{
		title:'SHA1',
		listExtension:'sha1',
		regex:/^([0-9a-fA-F]{40}) [ \*](.+)$/ /* SHA1 */
	}
];


/* Shortcuts */
function addEvent(e,ev,f){e.addEventListener(ev,f,false)}
function el(e){return document.getElementById(e)}
function stopPropagation(e){if(typeof e.stopPropagation!=='undefined')e.stopPropagation();else e.cancelBubble=true}

var filesByName={};
var queueToVerify=[];


/* Web Worker */
var webWorker=false;
try{
	webWorker=new Worker('./web_worker.js');
	webWorker.onmessage=function(event){
		if(event.data.result){
			filesByName[event.data.fileName].setChecksum(event.data.mode, event.data.result);
			verifyQueue();
		}
	};
}catch(e){
}
//webWorker=false;




function getMode(){
	return parseInt(el('select-mode').value);
}
function refreshIcons(){
	var mode=getMode();
	var className=MODES[mode].title.toLowerCase();
	
	if(mode===SFV){
		el('mobile-header-chrome').content='#83db88';
		el('mobile-header-safari').content='#83db88';
		el('message-mode').innerHTML=el('th-mode').innerHTML='CRC32';
	}else if(mode===MD5){
		el('mobile-header-chrome').content='#f78572';
		el('mobile-header-safari').content='#f78572';
		el('message-mode').innerHTML=el('th-mode').innerHTML='MD5';
	}else if(mode===SHA1){
		el('mobile-header-chrome').content='#8ad9ee';
		el('mobile-header-safari').content='#8ad9ee';
		el('message-mode').innerHTML=el('th-mode').innerHTML='SHA1';
	}

	el('button-export').innerHTML='Export .'+MODES[mode].listExtension+' list';
	el('logo').src='logo192_'+className+'.png';
	document.body.className=className;
	var links=document.getElementsByTagName('link');
	for(var i=0; i<links.length; i++){
		if(links[i].rel==='shortcut icon'){
			if(links[i].sizes.toString()==='16x16')
				links[i].href='./favicon_'+className+'.png';
			//else if(links[i].sizes.toString()==='192x192')
			//	links[i].href='./logo192_'+className+'.png';
		}
	}
	
	refreshWrapper();
}
function refreshWrapper(){
	if(Object.keys(filesByName).length){
		el('tbody').parentElement.style.display='table';
		el('message').style.display='none';
	}else{
		el('tbody').parentElement.style.display='none';
		el('message').style.display='block';
	}
}
function setMode(newMode){	
	refreshIcons();
	for(var fileName in filesByName){
		filesByName[fileName].refreshRow(newMode);
	}
	prepareQueue();
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
function verifyQueue(){
	if(queueToVerify.length)
		readFile(queueToVerify.shift());
}
function prepareQueue(){
	var currentMode=getMode();

	queueToVerify=[];
	
	for(var fileName in filesByName){
		if(filesByName[fileName].file){
			filesByName[fileName].refreshRow(false);
			if(filesByName[fileName].checksums[currentMode])
				filesByName[fileName].refreshRow(currentMode);
			else
				queueToVerify.push(filesByName[fileName]);
		}
	}
	verifyQueue();
}








function removeFile(fileName){
	el('tbody').removeChild(files[fileName].tr);
	delete files[fileName];
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
		this.checksums[i]=false;
		this.checksumsValid[i]=false;
	}

	el('tbody').appendChild(this.tr);

	
	if(file)
		this.file=file;
}
SFVFile.prototype.setChecksum=function(mode, newChecksum){this.checksums[mode]=newChecksum;this.refreshRow(mode)}
SFVFile.prototype.setChecksumValid=function(mode, newChecksum){this.checksumsValid[mode]=newChecksum;this.refreshRow(mode)}

SFVFile.prototype.refreshRow=function(mode){
	if(typeof this.checksums[mode]==='string' && typeof this.checksumsValid[mode]==='string'){
		if(this.checksums[mode]===this.checksumsValid[mode]){
			this.tr.children[1].innerHTML=this.checksums[mode];
			this.tr.className='verified';
		}else{
			this.tr.children[1].innerHTML='<span style="text-decoration:line-through">'+this.checksums[mode]+'</span> '+this.checksumsValid[mode];
			this.tr.className='error';
		}
	}else{
		if(typeof this.checksums[mode]==='string'){
			this.tr.children[1].innerHTML=this.checksums[mode];
		}else if(typeof this.checksumsValid[mode]==='string'){
			this.tr.children[1].innerHTML=this.checksumsValid[mode];
		}else{
			this.tr.children[1].innerHTML='?';
		}

		this.tr.className='';
	}
}















/* service worker */
const FORCE_HTTPS=true;
if(FORCE_HTTPS && location.protocol==='http:')
	location.href=window.location.href.replace('http:','https:');
else if(location.protocol==='https:' && 'serviceWorker' in navigator)
	navigator.serviceWorker.register('/sfv-checker/_cache_service_worker.js', {scope: '/sfv-checker/'});





/* initialize app */
addEvent(window,'load',function(){
	document.body.appendChild(DragAndDropZone);

	el('input-files').value='';

	addEvent(el('input-files'), 'change', function(){
		for(var i=0; i<this.files.length; i++){
			if(/\.sfv$/i.test(this.files[i].name)){
				el('select-mode').value=SFV;
				setMode(SFV);
				parseFileList(this.files[i], SFV);
			}else if(/\.md5$/i.test(this.files[i].name)){
				el('select-mode').value=MD5;
				setMode(MD5);
				parseFileList(this.files[i], MD5);
			}else if(/\.sha1$/i.test(this.files[i].name)){
				el('select-mode').value=SHA1;
				setMode(SHA1);
				parseFileList(this.files[i], SHA1);
			}else{
				var file=addFile(this.files[i].name, this.files[i]);
				file.tr.className='reading';
				refreshWrapper();
			}
		}
		document.getElementById('form').reset();
		prepareQueue();
	});
	
	refreshIcons();
});


function parseFileList(file, mode){
	if(!COMPATIBLE_BROWSER){
		throw 'IncompatibleBrowser';
		return null;
	}

	var fileReader=new FileReader();
	fileReader.addEventListener('load',function(){
		var lines=this.result.replace(/\r/g,'\n').replace(/\n+/g,'\n').split('\n');
		for(var i=0; i<lines.length; i++){
			var match=lines[i].match(MODES[mode].regex);
			if(match){
				if(mode===SFV)
					addFile(match[1]).setChecksumValid(SFV, match[2].toLowerCase());
				else
					addFile(match[2]).setChecksumValid(mode, match[1].toLowerCase());
				
				refreshWrapper();
			}
		}
	},false);

	fileReader.readAsText(file);
}

function readFile(file){
	if(!COMPATIBLE_BROWSER){
		throw 'IncompatibleBrowser';
		return false;
	}

	var fileReader=new FileReader();
	fileReader.addEventListener('load',function(evt){
		var u8array=new Uint8Array(evt.target.result);
		var currentMode=getMode();
		if(webWorker && currentMode!==SHA1){
			webWorker.postMessage({fileName:file.fileName, u8array:u8array, mode:currentMode}, [u8array.buffer]);
		}else{
			if(currentMode===SFV)
				file.setChecksum(currentMode, crc32(u8array));
			else if(currentMode===MD5)
				file.setChecksum(currentMode, md5(u8array));
			else if(currentMode===SHA1)
				queueSHA1(file.fileName, u8array);

			verifyQueue();
		}
	},false);

	fileReader.readAsArrayBuffer(file.file);
}




/* SHA-1 using Web Crypto API */
function queueSHA1(fileName, u8array){
	if(
		(window.crypto&&window.crypto.subtle&&window.crypto.subtle.digest) /*&&
		u8array.length<=MAX_SHA1_SIZE*/
	){
		window.crypto.subtle.digest('SHA-1', u8array.buffer).then(function(hash){
			var bytes=new Uint8Array(hash);
			var hexString='';
			for(var i=0;i<bytes.length;i++){
				if(bytes[i]<10)
					hexString+='0'+bytes[i];
				else
					hexString+=bytes[i].toString(16);
			}
			filesByName[fileName].setChecksum(SHA1, hexString);
		}).catch(function(error){
			console.error('web crypto sha1: '+error);
		});
	}
}






function exportFileList(type){
	var str='';
	var extension='';
	if(type===MD5){
		for(fileName in filesByName){
			var fileObj=filesByName[fileName];
			var md5=fileObj.checksums[MD5] || fileObj.checksumsValid[MD5] || false;
			if(md5)
				str+=md5+' *'+fileName+'\n';
		}
		extension='md5';
	}else if(type===SHA1){
		for(fileName in filesByName){
			var fileObj=filesByName[fileName];
			var sha1=fileObj.checksums[SHA1] || fileObj.checksumsValid[SHA1] || false;
			if(sha1)
				str+=sha1+' *'+fileName+'\n';
		}
		extension='sha1';
	}else{
		var maxLen=0;
		for(fileName in filesByName){
			var fileObj=filesByName[fileName];
			var crc32=fileObj.checksums[CRC32] || fileObj.checksumsValid[CRC32] || false;
			if(crc32 && fileName.length>maxLen)
				maxLen=fileName.length;
		}
		//console.log(maxLen);
		for(fileName in filesByName){
			var fileObj=filesByName[fileName];
			var crc32=fileObj.checksums[CRC32] || fileObj.checksumsValid[CRC32] || false;
			if(crc32){
				str+=fileName+'  ';
				for(var i=0; i<maxLen-fileName.length; i++)
					str+='&nbsp;';
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

/*
* FileSaver.js
* A saveAs() FileSaver implementation.
*
* By Eli Grey, http://eligrey.com
*
* License : https://github.com/eligrey/FileSaver.js/blob/master/LICENSE.md (MIT)
* source  : http://purl.eligrey.com/github/FileSaver.js
*/
var _global="object"==typeof window&&window.window===window?window:"object"==typeof self&&self.self===self?self:"object"==typeof global&&global.global===global?global:this;function bom(a,b){return"undefined"==typeof b?b={autoBom:!1}:"object"!=typeof b&&(console.warn("Deprecated: Expected third argument to be a object"),b={autoBom:!b}),b.autoBom&&/^\s*(?:text\/\S*|application\/xml|\S*\/\S*\+xml)\s*;.*charset\s*=\s*utf-8/i.test(a.type)?new Blob([String.fromCharCode(65279),a],{type:a.type}):a}function download(a,b,c){var d=new XMLHttpRequest;d.open("GET",a),d.responseType="blob",d.onload=function(){saveAs(d.response,b,c)},d.onerror=function(){console.error("could not download file")},d.send()}function corsEnabled(a){var b=new XMLHttpRequest;return b.open("HEAD",a,!1),b.send(),200<=b.status&&299>=b.status}function click(a){try{a.dispatchEvent(new MouseEvent("click"))}catch(c){var b=document.createEvent("MouseEvents");b.initMouseEvent("click",!0,!0,window,0,0,0,80,20,!1,!1,!1,!1,0,null),a.dispatchEvent(b)}}var saveAs=_global.saveAs||("object"!=typeof window||window!==_global?function(){}:"download"in HTMLAnchorElement.prototype?function(b,c,d){var e=_global.URL||_global.webkitURL,f=document.createElement("a");c=c||b.name||"download",f.download=c,f.rel="noopener","string"==typeof b?(f.href=b,f.origin===location.origin?click(f):corsEnabled(f.href)?download(b,c,d):click(f,f.target="_blank")):(f.href=e.createObjectURL(b),setTimeout(function(){e.revokeObjectURL(f.href)},4E4),setTimeout(function(){click(f)},0))}:"msSaveOrOpenBlob"in navigator?function(b,c,d){if(c=c||b.name||"download","string"!=typeof b)navigator.msSaveOrOpenBlob(bom(b,d),c);else if(corsEnabled(b))download(b,c,d);else{var e=document.createElement("a");e.href=b,e.target="_blank",setTimeout(function(){click(e)})}}:function(a,b,c,d){if(d=d||open("","_blank"),d&&(d.document.title=d.document.body.innerText="downloading..."),"string"==typeof a)return download(a,b,c);var e="application/octet-stream"===a.type,f=/constructor/i.test(_global.HTMLElement)||_global.safari,g=/CriOS\/[\d]+/.test(navigator.userAgent);if((g||e&&f)&&"object"==typeof FileReader){var h=new FileReader;h.onloadend=function(){var a=h.result;a=g?a:a.replace(/^data:[^;]*;/,"data:attachment/file;"),d?d.location.href=a:location=a,d=null},h.readAsDataURL(a)}else{var i=_global.URL||_global.webkitURL,j=i.createObjectURL(a);d?d.location=j:location.href=j,d=null,setTimeout(function(){i.revokeObjectURL(j)},4E4)}});_global.saveAs=saveAs.saveAs=saveAs,"undefined"!=typeof module&&(module.exports=saveAs);









/* drag and drop */
DragAndDropZone=(function(){
	function preventDefault(e){if(e.preventDefault)e.preventDefault();else e.returnValue=false}

	var showDrag=false, timeout=-1;

	/* check if drag items are files */
	function checkIfDraggingFiles(e){
		if(e.dataTransfer.types)
			for(var i=0;i<e.dataTransfer.types.length;i++)
				if(e.dataTransfer.types[i]==='Files')
					return true;
		return false
	}

	/* remove dragging-files class name from body */
	function removeClass(){document.body.className=document.body.className.replace(/ dragging-files/g,'')}


	/* add drag and drop events */
	addEvent(document,'drop',removeClass);
	addEvent(document,'dragenter',function(e){
		if(checkIfDraggingFiles(e)){
			if(!/ dragging-files/.test(document.body.className))
				document.body.className+=' dragging-files'
			showDrag=true; 
		}
	});
	addEvent(document,'dragleave',function(e){
		showDrag=false; 
		clearTimeout(timeout);
		timeout=setTimeout(function(){
			if(!showDrag)
				removeClass();
		}, 200);
	});
	addEvent(document,'dragover',function(e){
		if(checkIfDraggingFiles(e)){
			stopPropagation(e);
			preventDefault(e);
			showDrag=true; 
		}
	});

	/* create drag and drop zone */
	var overlay=document.createElement('div');
	overlay.id='drop-overlay';
	overlay.innerHTML='Drop files here';

	addEvent(overlay,'drop',function(e){
		stopPropagation(e);
		preventDefault(e);
		removeClass();
		if(checkIfDraggingFiles(e)){
			for(var i=0; i<e.dataTransfer.files.length; i++){
				addFile(e.dataTransfer.files[i].name, e.dataTransfer.files[i]);
			}
			refreshWrapper();
			prepareQueue();
		}
	});

	return overlay
}());
