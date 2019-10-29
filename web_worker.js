self.importScripts(
	'./crc32.js',
	'./md5.js'
);

self.onmessage = event => { // listen for messages from the main thread
	var returnObject={
		fileName:event.data.fileName,
		mode:event.data.mode,
		u8array:event.data.u8array
	};
	
	if(event.data.mode===0)
		returnObject.result=crc32(event.data.u8array);
	else if(event.data.mode===1)
		returnObject.result=md5(event.data.u8array);
	else
		returnObject.result='invalid';

	//console.log(returnObject.result);
	self.postMessage(returnObject, [event.data.u8array.buffer]);
};