/* CRC32 - JS implementation for SFV Checker */
/* borrowed from Alex - https://stackoverflow.com/a/18639999 */

var HasherCRC32=(function(){
	const CRC32_TABLE=(function(){
		var c,crcTable=[];
		for(var n=0;n<256;n++){
			c=n;
			for(var k=0;k<8;k++)
				c=((c&1)?(0xedb88320^(c>>>1)):(c>>>1));
			crcTable[n]=c;
		}
		return crcTable;
	}());
	
	return{
		hash:function(u8array){
			var crc=0^(-1);

			for(var i=0;i<u8array.byteLength;i++)
				crc=(crc>>>8)^CRC32_TABLE[(crc^u8array[i])&0xff];

			var hexString=((crc^(-1))>>>0).toString(16);
			while(hexString.length<8)
				hexString='0'+hexString;
			return hexString;
		}
	}
})();
