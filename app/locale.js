var MarcTranslatableUI=(function(){
	var defaultLocale,currentLocale;
	var locales, variableStrings;

	var cleanLangCode=function(langCode){
		return langCode.toLowerCase().replace('-','_').replace(/[^a-z_]/g,'');
	};
	var findLocale=function(langCode){
		langCode=cleanLangCode(langCode);
		for(var i=0; i<locales.length; i++){
			if(locales[i]===langCode)
				return locales[i];
		}
		return null;
	};
	
	var translateElement=function(e){
		if(e.tagName==='DIV' || e.tagName==='SPAN' || e.tagName==='A'){
			e.innerHTML=this._(e.getAttribute('data-lang'));
			if(/%s/.test(e.innerHTML)){
				e.innerHTML=e.innerHTML.replace('%s', variableStrings[e.getAttribute('data-lang')]);
			}
		}
	}

	return{
		_:function(str){
			return currentLocale.strings[str] || defaultLocale.strings[str] || str;
		},

		enable:function(data){
			locales=data.langs;
			defaultLocale=currentLocale=locales[0];
			variableStrings=data.variableStrings;
		},

		getCurrentLanguageCode:function(){
			return currentLocale.id
		},
		getAllLanguageCodes:function(){
			var langCodes=[];
			for(var i=0; i<locales.length; i++){
				langCodes.push(locales[i].id);
			}
			return langCodes
		},
		nextLanguage:function(){
			var localeIndex=locales.indexOf(currentLocale)+1;
			if(localeIndex===locales.length)
				localeIndex=0;

			this.setLanguage(locales[localeIndex].id);
			return currentLocale.id;
		},
		setLanguage:function(newLangCode){
			newLangCode=cleanLangCode(newLangCode);
			if(newLangCode!==currentLocale.id){
				for(var i=0; i<locales.length; i++){
					if(locales[i].id===newLangCode){
						currentLocale=locales[i];
						this.refresh();
						break;
					}
				}
			}
		},

		refresh:function(){
			var translatableElements=document.querySelectorAll('[data-lang]');
			for(var i=0; i<translatableElements.length; i++){
				translateElement(translatableElements[i]);
			}
		},
		refreshOne:function(str){
			var translatableElement=document.querySelector('[data-lang=\"'+str+'\"]');
			translateElement(translatableElement);
		}
	}
}());
function _(str){return MarcTranslatableUI._(str);}



MarcTranslatableUI.enable({
	langs:[
		{
			id:'en',
			strings:{
				'add_files':'Add files',
				'export_list':'Export .%s list',
				'clear_list':'Clear file list',
				'mode':'Mode',
				'empty1':'Drag and drop files here in order to calculate their %s checksums.',
				'empty2':'Drag and drop a .sfv, .md5 or .sha1 file in order to check file integrities.',
				'calculating':'Calculating',
				'copied_to_clipboard':'Hash copied to clipboard',

				'lang':'English',
				'footer_by':'by',
				'footer_github':'See on Github',
				'footer_donate':'Donate'
			}
		},{
			id:'es',
			strings:{
				'add_files':'Añadir ficheros',
				'export_list':'Exportar lista .%s',
				'clear_list':'Vaciar lista',
				'mode':'Modo',
				'empty1':'Arrastra y suelta ficheros aquí para calcular sus checksums %s.',
				'empty2':'Arrastra y suelta un fichero .sfv, .md5 o .sha1 para verificar la integridad de los ficheros.',
				'calculating':'Calculando',
				'copied_to_clipboard':'Hash copiado al portapapeles',

				'lang':'Español',
				'footer_by':'por',
				'footer_github':'Ver en Github',
				'footer_donate':'Donar'
			}
		}
	],
	variableStrings:{
		'export_list':function(){
			return MODES[getMode()].listExtension;
		},
		'empty1':function(){
			if(getMode()===MODE_CRC32){
				return 'CRC32';
			}else if(getMode()===MODE_MD5){
				return 'MD5';
			}else if(getMode()===MODE_SHA1){
				return'SHA1';
			}
			return '?';
		}
	}
});


