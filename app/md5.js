/* MD5 - JS implementation for SFV Checker */
/* adapted from http://www.myersdaily.org/joseph/javascript/md5.js, specification at https://tools.ietf.org/html/rfc1321#section-3.1 */

var HasherMD5=(function(){
	//build element table instead of hardcoding
	/*const T=(function(){
		var T=new Array(64);
		for (var i=0; i<64; i++) {
			T[i]=(Math.abs(Math.sin(i + 1)) * 0x100000000) >>> 0;
		}
		return T;
	}());*/

	var swapEndian=function(word){
		return(
			(((word << 8) | (word >>> 24)) & 0x00ff00ff) |
			(((word << 24) | (word >>> 8)) & 0xff00ff00)
		) >>> 0;
	}

	/* auxiliary functions */
	var ff=function(a, b, c, d, x, s, t) {
		var n=a + ((b & c) | (~b & d)) + x + t;
		return ((n << s) | (n >>> (32-s))) + b;
	}
	var gg=function(a, b, c, d, x, s, t) {
		var n=a + ((b & d) | (c & ~d)) + x + t;
		return ((n << s) | (n >>> (32-s))) + b;
	}
	var hh=function(a, b, c, d, x, s, t) {
		var n=a + (b ^ c ^ d) + x + t;
		return ((n << s) | (n >>> (32-s))) + b;
	}
	var ii=function(a, b, c, d, x, s, t) {
		var n=a + (c ^ (b | ~d)) + x + t;
		return ((n << s) | (n >>> (32-s))) + b;
	}

	var md5process=function(hashBuffer, wordsBlock){
		var a=hashBuffer[0],b=hashBuffer[1],c=hashBuffer[2],d=hashBuffer[3];

		a=ff(a,b,c,d,wordsBlock[0],7,-680876936);
		d=ff(d,a,b,c,wordsBlock[1],12,-389564586);
		c=ff(c,d,a,b,wordsBlock[2],17,606105819);
		b=ff(b,c,d,a,wordsBlock[3],22,-1044525330);
		a=ff(a,b,c,d,wordsBlock[4],7,-176418897);
		d=ff(d,a,b,c,wordsBlock[5],12,1200080426);
		c=ff(c,d,a,b,wordsBlock[6],17,-1473231341);
		b=ff(b,c,d,a,wordsBlock[7],22,-45705983);
		a=ff(a,b,c,d,wordsBlock[8],7,1770035416);
		d=ff(d,a,b,c,wordsBlock[9],12,-1958414417);
		c=ff(c,d,a,b,wordsBlock[10],17,-42063);
		b=ff(b,c,d,a,wordsBlock[11],22,-1990404162);
		a=ff(a,b,c,d,wordsBlock[12],7,1804603682);
		d=ff(d,a,b,c,wordsBlock[13],12,-40341101);
		c=ff(c,d,a,b,wordsBlock[14],17,-1502002290);
		b=ff(b,c,d,a,wordsBlock[15],22,1236535329);

		a=gg(a,b,c,d,wordsBlock[1],5,-165796510);
		d=gg(d,a,b,c,wordsBlock[6],9,-1069501632);
		c=gg(c,d,a,b,wordsBlock[11],14,643717713);
		b=gg(b,c,d,a,wordsBlock[0],20,-373897302);
		a=gg(a,b,c,d,wordsBlock[5],5,-701558691);
		d=gg(d,a,b,c,wordsBlock[10],9,38016083);
		c=gg(c,d,a,b,wordsBlock[15],14,-660478335);
		b=gg(b,c,d,a,wordsBlock[4],20,-405537848);
		a=gg(a,b,c,d,wordsBlock[9],5,568446438);
		d=gg(d,a,b,c,wordsBlock[14],9,-1019803690);
		c=gg(c,d,a,b,wordsBlock[3],14,-187363961);
		b=gg(b,c,d,a,wordsBlock[8],20,1163531501);
		a=gg(a,b,c,d,wordsBlock[13],5,-1444681467);
		d=gg(d,a,b,c,wordsBlock[2],9,-51403784);
		c=gg(c,d,a,b,wordsBlock[7],14,1735328473);
		b=gg(b,c,d,a,wordsBlock[12],20,-1926607734);

		a=hh(a,b,c,d,wordsBlock[5],4,-378558);
		d=hh(d,a,b,c,wordsBlock[8],11,-2022574463);
		c=hh(c,d,a,b,wordsBlock[11],16,1839030562);
		b=hh(b,c,d,a,wordsBlock[14],23,-35309556);
		a=hh(a,b,c,d,wordsBlock[1],4,-1530992060);
		d=hh(d,a,b,c,wordsBlock[4],11,1272893353);
		c=hh(c,d,a,b,wordsBlock[7],16,-155497632);
		b=hh(b,c,d,a,wordsBlock[10],23,-1094730640);
		a=hh(a,b,c,d,wordsBlock[13],4,681279174);
		d=hh(d,a,b,c,wordsBlock[0],11,-358537222);
		c=hh(c,d,a,b,wordsBlock[3],16,-722521979);
		b=hh(b,c,d,a,wordsBlock[6],23,76029189);
		a=hh(a,b,c,d,wordsBlock[9],4,-640364487);
		d=hh(d,a,b,c,wordsBlock[12],11,-421815835);
		c=hh(c,d,a,b,wordsBlock[15],16,530742520);
		b=hh(b,c,d,a,wordsBlock[2],23,-995338651);

		a=ii(a,b,c,d,wordsBlock[0],6,-198630844);
		d=ii(d,a,b,c,wordsBlock[7],10,1126891415);
		c=ii(c,d,a,b,wordsBlock[14],15,-1416354905);
		b=ii(b,c,d,a,wordsBlock[5],21,-57434055);
		a=ii(a,b,c,d,wordsBlock[12],6,1700485571);
		d=ii(d,a,b,c,wordsBlock[3],10,-1894986606);
		c=ii(c,d,a,b,wordsBlock[10],15,-1051523);
		b=ii(b,c,d,a,wordsBlock[1],21,-2054922799);
		a=ii(a,b,c,d,wordsBlock[8],6,1873313359);
		d=ii(d,a,b,c,wordsBlock[15],10,-30611744);
		c=ii(c,d,a,b,wordsBlock[6],15,-1560198380);
		b=ii(b,c,d,a,wordsBlock[13],21,1309151649);
		a=ii(a,b,c,d,wordsBlock[4],6,-145523070);
		d=ii(d,a,b,c,wordsBlock[11],10,-1120210379);
		c=ii(c,d,a,b,wordsBlock[2],15,718787259);
		b=ii(b,c,d,a,wordsBlock[9],21,-343485551);

		hashBuffer[0]=(a+hashBuffer[0]) >>> 0;
		hashBuffer[1]=(b+hashBuffer[1]) >>> 0;
		hashBuffer[2]=(c+hashBuffer[2]) >>> 0;
		hashBuffer[3]=(d+hashBuffer[3]) >>> 0;
	}

	return{
		hash:function(u8array){
			var n=u8array.length;
			var nBits=u8array.length*8;

			var hashBuffer=[0x67452301,0xefcdab89,0x98badcfe,0x10325476]; //initial values

			/* start hashing 16-word blocks (16*4=64 bytes) */
			for(var i=64;i<=u8array.length;i+=64){
				/* build block of words */
				var sixteenWordBlock=new Array(16);
				var readIndex=i-64;
				for(var j=0; j<16; j++){
					sixteenWordBlock[j]=u8array[readIndex] + (u8array[readIndex+1] << 8) + (u8array[readIndex+2] << 16) + (u8array[readIndex+3] << 24);
					readIndex+=4;
				}
				
				md5process(hashBuffer, sixteenWordBlock);
			}

			/* append padding bits: a 1 then zeroes until length is divisible by 512 */
			u8array=u8array.slice(i-64);
			var tail=[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
			for(var i=0;i<u8array.length;i++)
				tail[i>>2]|=u8array[i]<<((i%4)<<3);
			tail[i>>2]|=0x80<<((i%4)<<3);
			if(i>55){
				md5process(hashBuffer, tail);
				for(var i=0;i<16;i++)
					tail[i]=0;
			}
			/* at bit 448, add original file size */
			tail[14]=nBits;
			tail[15]=Math.floor(n/536870912) >>> 0; //if file is bigger than 512Mb*8, value is bigger than 32 bits, so it needs two words to store its length

			/* hash latest block (which includes the appended bits) */
			md5process(hashBuffer, tail);


			var hexString='';
			for(var i=0;i<hashBuffer.length;i++){
				var hex=swapEndian(hashBuffer[i]).toString(16);
				while(hex.length<8)
					hex='0'+hex;
				hexString+=hex;
			}

			return hexString
		}
	}
}());
