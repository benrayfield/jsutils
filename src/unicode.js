//Ben F Rayfield offers this js file opensource MIT license

//TODO test
var unicode = {
	//TODO consider using TextEncoder instead, which is a web standard in progress and works in at least firefox chrome and 1 other
	
	utf8TextEncoder: new TextEncoder('utf-8'),
	
	utf8TextDecoder: new TextDecoder('utf-8'),
	
	stringToUtf8AsUint8Array: function(s){
		//log('unicode.utf8TextEncoder='+unicode.utf8TextEncoder+' '+mapToString(unicode.utf8TextEncoder));
		//log('param of encode: '+s);
		var u = unicode.utf8TextEncoder.encode(s);
		//var t = typeof u;
		//if(t != 'Uint8Array') throw 'Expected TextEncoder.encode(string) to return Uint8Array but got a '+t+': '+u+': '+mapToString(u);
		return u;
	},
	
	utf8AsUint8ArrayToString: function(bytes){
		return unicode.utf8TextDecoder.decode(bytes);
	},
	
	asBytes: function(stringOrBytes){
		var t = typeof stringOrBytes;
		if(t == 'Uint8Array') return stringOrBytes;
		if(t == 'string') return unicode.stringToUtf8AsUint8Array(stringOrBytes);
		throw 'Unknown type: '+t;
	},
	
	asString: function(stringOrBytes){
		var t = typeof stringOrBytes;
		if(t == 'string') return stringOrBytes;
		if(t == 'Uint8Array') return unicode.utf8AsUint8ArrayToString(stringOrBytes);
		throw 'Unknown type: '+t;
	}
	
};