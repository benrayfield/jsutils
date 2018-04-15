//Ben F Rayfield offers this js file opensource MIT license
bitfuncs = {};

bitfuncs.concatUint8Arrays = function(x, y){
	var c = new Uint8Array(x.byteLength+y.byteLength);
	c.set(x,0);
	c.set(y, x.byteLength);
	return c;
}

bitfuncs.hexToUint8Array = function(hex){
	if((hex.length%2) != 0) throw 'Odd length';
	var u = new Uint8Array(hex.length/2);
	for(var i=0; i<hex.length/2; i++){
		u[i] = parseInt(hex.substring(i+i, i+i+2),16);
	}
	return u;
};

bitfuncs.uint8ArrayToHex = function(bytes){
	var s = '';
	for(var i=0; i<bytes.byteLength; i++){
		var dd = (0+bytes[i]).toString(16).toLowerCase();
		if(dd.length < 2) dd = '0'+dd;
		s += dd;
	}
	return s;
};
