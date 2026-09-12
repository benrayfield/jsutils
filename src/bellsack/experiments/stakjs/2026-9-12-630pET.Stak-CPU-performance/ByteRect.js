/* ByteRect excerpt from benrayfield's supplied SimpleCanvas.html.
   Original code is MIT licensed; pixel indexing and writes are unchanged. */

var ByteRect = function(bytes, height, width){
	this.bytes = bytes;
	this.height = height;
	this.width = width;
};


ByteRect.prototype.index = function(y, x, colorDim){
	return (y*this.width+x)*4+colorDim;
};

ByteRect.prototype.read = function(y, x, colorDim){
	return this.bytes[(y*this.width+x)*4+colorDim];
};


ByteRect.prototype.write = function(y, x, colorDim, bright){
	this.bytes[(y*this.width+x)*4+colorDim] = bright;
};


ByteRect.prototype.atYXWriteRGB = function(y, x, redByte, greenByte, blueByte){
	if(x < 0 || this.width <= x || y < 0 || this.height <= y) return;
	let ind = (y*this.width+x)*4;
	this.bytes[ind+RED] = redByte;
	this.bytes[ind+GREEN] = greenByte;
	this.bytes[ind+BLUE] = blueByte;
};

