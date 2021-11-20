/* SHA-1 using Web Crypto API */
var HasherSHA1=(function(){
	return{
		hash:function(arrayBuffer, file){
			if((window.crypto && window.crypto.subtle && window.crypto.subtle.digest) /*&& arrayBuffer.byteLength<=MAX_SHA1_SIZE*/){
				window.crypto.subtle.digest('SHA-1', arrayBuffer).then(function(hash){
					isHashing=false;

					var bytes=new Uint8Array(hash);
					var hexString='';
					for(var i=0;i<bytes.length;i++){
						if(bytes[i]<16)
							hexString+='0'
						hexString+=bytes[i].toString(16);
					}
					file.setChecksum(MODE_SHA1, hexString);

					hashNextFile();
				}).catch(function(err){
					file.setChecksum(MODE_SHA1, 'SHA1 error: '+err);
					isHashing=false;
				});
			}else{
				file.setChecksum(MODE_SHA1, 'Incompatible browser.');
				isHashing=false;
			}
		}
	}
})();