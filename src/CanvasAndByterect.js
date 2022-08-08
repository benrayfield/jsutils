//Canvas and ByteRect code are opensource MIT licensed
//(parts from benrayfield's various other projects including https://jsfiddle.net/q687fcrk/1/ and
//https://github.com/benrayfield/smartblob/blob/master/data/smartblob/WebcamSeesBendableLoopAsGameControllerAjaxToServer.html )
//and some parts from https://github.com/benrayfield/jsutils/blob/master/src/arvox/arvox.html

var dom = id=>document.getElementById(id);

//byte offsets for ByteRect, canvas, etc, in js.
const RED = 0, GREEN = 1, BLUE = 2, ALPHA = 3;
var colorDimRed = RED;
var colorDimGreen = GREEN;
var colorDimBlue = BLUE;
var colorDimAlpha = ALPHA;

var FullScreenCanvas = function(parentDom, optionalHeight, optionalWidth){
	if(parentDom === undefined) parentDom = document.body;
	this.dom = document.createElement('canvas');
	//TODO z order, in front of everything else.
	//this.dom = document.getElementById('canv'); //FIXME remove this line, use createElement instead.
	this.context = null;
	this.imageData = null;
	this.pixels = null;
	this.byteRect = null;
	parentDom.appendChild(this.dom);
	if(!optionalHeight){ //full screen, positioned absolute, else it normally goes in a div
		this.dom.style.position = 'absolute';
		this.dom.style.left = '0px';
		this.dom.style.top = '0px';
	}
	
	this.resizeCanvas = function(optionalHeight, optionalWidth){
		if(this.dom.width != window.innerWidth) this.dom.width = (optionalWidth || window.innerWidth);
		if(this.dom.height != window.innerHeight) this.dom.height = (optionalHeight || window.innerHeight);
	}
	
	//TODO optimize, if you're not reading from the canvas, maybe can skip parts of this or only call this once?
	this.beforePaint = function(){
		if(this.dom == null) throw 'No canvas';
		this.context = this.dom.getContext('2d');
		//console.log('this.dom.width = '+this.dom.width);
		this.imageData = this.context.getImageData(0, 0, this.dom.width, this.dom.height);
		this.pixels = this.imageData.data;
		this.byteRect = new ByteRect(this.pixels, this.dom.height, this.dom.width);
	};
	
	//call this after modify byteRect.bytes which contains pixel colors to write to Canvas.
	this.afterPaint = function(){
		if(this.dom == null) throw 'No canvas';
		//this.context.drawImage(this.dom, 0, 0, this.dom.width, this.dom.height);
		this.context.putImageData(this.imageData, 0, 0);
	};
	
	this.removeFromScreen = function(){
		this.dom.remove();
		this.dom = null;
		this.context = null;
		this.imageData = null;
		this.pixels = null;
		this.byteRect = null;
	};
	
	this.resizeCanvas(optionalHeight, optionalWidth);
	this.beforePaint();
};

var between = (min,val,max)=>Math.max(min,Math.min(val,max));

//readable and writable pixels as Uint8Array. A canvas is a kind of Uint8Array.
//Single pixel read and write funcs are slow unless you just do a few places.
//TODO Write horizontal lines of same color or 2 colors on end interpolating between,
//and these lines can be derived from triangle which has different color at each corner.
var ByteRect = function(bytes, height, width){
	this.bytes = bytes;
	this.height = height;
	this.width = width;
};

//TODO choose [y x] vs [x y z scale] order. Swap y and x in ByteRect params order? aftrans is [x y z scale].

ByteRect.prototype.index = function(y, x, colorDim){
	return (y*this.width+x)*4+colorDim;
};

ByteRect.prototype.read = function(y, x, colorDim){
	return this.bytes[(y*this.width+x)*4+colorDim];
};

ByteRect.prototype.readSafe = function(y, x, colorDim){
	return this.bytes[between(0,(y*this.width+x)*4+colorDim,this.bytes.length-1)];
};


ByteRect.prototype.write = function(y, x, colorDim, bright){
	this.bytes[(y*this.width+x)*4+colorDim] = bright;
};

ByteRect.prototype.writeSafe = function(y, x, colorDim, bright){
	this.bytes[between(0,(y*this.width+x)*4+colorDim,this.bytes.length-1)] = bright;
};

ByteRect.prototype.writeSafeRGBA = function(y, x, redByte, greenByte, blueByte, optionalAlphaByte){
	if(optionalAlphaByte === undefined) optionalAlphaByte = 255; //visible
	let index = between(0,(y*this.width+x)*4,this.bytes.length-4);
	this.bytes[index+RED] = redByte;
	this.bytes[index+GREEN] = greenByte;
	this.bytes[index+BLUE] = blueByte;
	this.bytes[index+ALPHA] = optionalAlphaByte;
};

ByteRect.prototype.atYXWriteRGB = function(y, x, redByte, greenByte, blueByte){
	if(x < 0 || this.width <= x || y < 0 || this.height <= y) return;
	let ind = (y*this.width+x)*4;
	this.bytes[ind+RED] = redByte;
	this.bytes[ind+GREEN] = greenByte;
	this.bytes[ind+BLUE] = blueByte;
};

ByteRect.prototype.writeHoriz = function(y, fromX, toXExclusive, colorDim, fromBright, toBright){
	var indexStart = this.index(y, fromX, colorDim);
	var pixelSiz = toXExclusive-fromX;
	var siz = pixelSiz*4;
	var bright = fromBright;
	var brightAdd = (toBright-fromBright)/pixelSiz;
	for(var i=0; i<siz; i+=4){
		bright += brightAdd;
		this.bytes[indexStart+i] = Math.floor(bright) & 0xff;
	}
};

//modifies this ByteRect
ByteRect.prototype.flipHorizontal = function(){
	let bytes = this.bytes;
	for(let y=0; y<this.height; y++){
		let xMid = Math.floor(this.width/2);
		let offsetA = y*this.width*4; //first byte index of first pixel in row
		let offsetB = ((y+1)*this.width-1)*4; //first byte of last pixel in row
		for(let x=0; x<xMid; x++){
			for(let colorDim=0; colorDim<4; colorDim++){ //swap 2 pixels as 4 bytes each
				let temp = bytes[offsetA+colorDim];
				bytes[offsetA+colorDim] = bytes[offsetB+colorDim];
				bytes[offsetB+colorDim] = temp;
			}
			offsetA += 4;
			offsetB -= 4;
		}
	}
};

//modifies this ByteRect
ByteRect.prototype.flipVertical = function(){
	let bytes = this.bytes;
	for(let y=0; y<this.height/2; y++){
		let oppY = this.height-1-y;
		let len = this.width*4;
		let offsetA = y*len;
		let offsetB = oppY*len;
		for(let i=0; i<len; i++){
			let temp = bytes[offsetA+i];
			bytes[offsetA+i] = bytes[offsetB+i];
			bytes[offsetB+i] = temp;
		}
	}
};

ByteRect.prototype.verifySameSizeAs = function(byteRect){
	if(!byteRect) throw 'Param ByteRect = '+byteRect;
	if(this.height != byteRect.height) throw this.height+' == this.height != byteRect.height == '+byteRect.height;
	if(this.width != byteRect.width) throw this.width+' == this.width != byteRect.width == '+byteRect.width;
};

/*
//returns a new ByteRect of given size
ByteRect.prototype.resize = function(newHeight, newWidth){
	let newBytes = new Uint8Array(newHeight*newWidth*4);
	let ret = new ByteRect(newBytes, newHeight, newWidth);
	for(let newY=0; newY<newHeight; newY++){
		//let oldYSmooth = newY*this.height/newHeight; //smooth for bilinear interpolation
		let oldY = Math.floor(newY*this.height/newHeight);
		for(let newX=0; newX<newWidth; newX++){
			//let oldXSmooth = newX*this.width/newWidth;
			//let oldXLow = Math.floor(oldXSmooth);
			//let oldXHigh = Math.min();
			let oldX = Math.floor(newX*this.width/newWidth);
			//let oldIndex = (oldY*this.width+oldX)*4;
			//let newIndex = (newY*newWidth+newX)*4;
			//let oldIndex = this.index(oldY, oldX, colorDim);
			//let newIndex = ret.index(newY, newX, colorDim);
			for(let colorDim=0; colorDim<4; colorDim++){
				ret.bytes[newIndex+colorDim] = this.bytes[oldIndex+colorDim];
			}
		}
	}
	return ret;
};*/

//returns a new ByteRect of given size
ByteRect.prototype.resize = function(newHeight, newWidth){
	let newBytes = new Uint8Array(newHeight*newWidth*4);
	let ret = new ByteRect(newBytes, newHeight, newWidth);
	for(let newY=0; newY<newHeight; newY++){
		let oldY = Math.floor(newY*this.height/newHeight);
		for(let newX=0; newX<newWidth; newX++){
			let oldX = Math.floor(newX*this.width/newWidth);
			let oldIndex = (oldY*this.width+oldX)*4;
			let newIndex = (newY*newWidth+newX)*4;
			//let oldIndex = this.index(oldY, oldX, colorDim);
			//let newIndex = ret.index(newY, newX, colorDim);
			for(let colorDim=0; colorDim<4; colorDim++){
				ret.bytes[newIndex+colorDim] = this.bytes[oldIndex+colorDim];
			}
		}
	}
	return ret;
};

ByteRect.prototype.paintLineYXYXRGB = function(fromY, fromX, toY, toX, redByte, greenByte, blueByte){
	let diffY = toY-fromY;
	let diffX = toX-fromX;
	let len = Math.hypot(diffY, diffX);
	let numPoints = Math.ceil(len*1.5);
	for(let i=0; i<numPoints; i++){
		//TODO optimize
		let y = Math.round(fromY+diffY*i/numPoints);
		let x = Math.round(fromX+diffX*i/numPoints);
		this.atYXWriteRGB(y, x, redByte, greenByte, blueByte);
	}
};

ByteRect.picDataUrlToByterect = function(dataUrl_or_url,asyncGetByteRect){
	const img = document.createElement('img');
	//img.crossOrigin = "Anonymous";

	let func = function(event){	
		const canv = document.createElement('canvas');
		canv.width = img.width;
		canv.height = img.height;
		document.body.appendChild(canv);
		let cx = canv.getContext('2d');
		cx.drawImage(img, 0, 0);
		//if(!img.width) throw 'w';
		let dd = cx.getImageData(0, 0, img.width, img.height);
		//let dd = cx.getImageData(0, 0, 264, 264);
		let d = dd.data;
		let arr = new Uint8Array(d.length);
		for(let i=0; i<arr.length; i++) arr[i] = d[i];
		let ret = new ByteRect(arr, img.height, img.width);
		asyncGetByteRect(ret);
		canv.remove();
		img.remove();
	};
	
	//requestAnimationFrame(func);
	img.onload = func;
	img.src = dataUrl_or_url;
	document.body.appendChild(img);
};


/** utc time in seconds */
var time = function(){
	return Date.now()*.001;
};

var timeStarted = 0;

/** get bellcurve height on a chosen bellcurve thats stretched and moved */
var bell = function(ave, dev, maxHeight, observe){
	let diff = (observe-ave)/dev;
	return Math.exp(-diff*diff);
};

var sigmoid = function(x){
	return .5+.5*Math.tanh(x);
};

var asByte = num=>(Math.max(0,Math.min(Math.floor(num),255))|0);

//0 to 255
var backgroundRed = 0;
var backgroundGreen = 0;
var backgroundBlue = 0;


//age in seconds since transition started. Just paints onto ByteRect
var doGraphicsDtAgeByterect = function(dt, age, byteRect){

	let bytes = byteRect.bytes;
	let offset = Math.floor(Math.sin(time()*5*2*Math.PI)*100+100);
	let w = byteRect.width;
	let h = byteRect.height;
	let cx = Math.floor(w/2); //center x
	let cy = Math.floor(h/2); //center y
	for(let i=0; i<bytes.length; i+=4){
		bytes[i+RED] = backgroundRed;
		bytes[i+GREEN] = backgroundGreen;
		bytes[i+BLUE] = backgroundBlue;
		bytes[i+ALPHA] = 255;
	}
	let i = 0;
	for(let y=0; y<h; y++){
		for(let x=0; x<w; x++){
			bytes[i+RED] = (x+age*35)&255;
			bytes[i+GREEN] = (x+y*age)&255;
			bytes[i+BLUE] = (333*x/y)&255;
			i += 4;
		}
		i += w*4; //row of pixels
	}

};

//sets this.weightedSum and this.weight, starting with weight 1 and weightedSum is copied from bytes
ByteRect.prototype.createTwoFloatsEachIfNotExist = function(){
	if(!this.weightedSum){
		this.weightedSum = new Float32Array(this.bytes.length);
		this.weight = new Float32Array(this.bytes.length);
		this.countWeights = new Int32Array(this.bytes.length); //how many times was anything added to [both at once: this.weight and this.weightedSum]?
	}
};

ByteRect.prototype.addBytesToWeightedSums = function(weight){
	this.createTwoFloatsEachIfNotExist();
	for(let i=0; i<this.bytes.length; i++){
		//let sum = this.weightedSum[i]*this.weight[i];
		this.weightedSum[i] += weight*this.bytes[i];
		this.weight[i] += weight;
	}
};

ByteRect.prototype.copyWeightedSumsToBytes = function(){
	for(let i=0; i<this.bytes.length; i++){
		this.bytes[i] = asByte(this.weightedSum[i]/this.weight[i]); //0 if weight is 0.
	}
};

ByteRect.prototype.addColorToWeightedSumByBilinearInterpolation = function(y, x, red, green, blue, alpha, weight){
	let yLow = Math.floor(y);
	let xLow = Math.floor(x);
	let yFraction = y-yLow;
	let xFraction = x-xLow;
	let yHigh = yLow+1; //FIXME does this go off edge of pic ever?
	let xHigh = xLow+1;
	this.addColorToWeightedSum((yLow*this.width+xLow)*4, red, green, blue, alpha, (1-yFraction)*(1-xFraction)*weight);
	this.addColorToWeightedSum((yLow*this.width+xHigh)*4, red, green, blue, alpha, (1-yFraction)*xFraction*weight);
	this.addColorToWeightedSum((yHigh*this.width+xLow)*4, red, green, blue, alpha, yFraction*(1-xFraction)*weight);
	this.addColorToWeightedSum((yHigh*this.width+xHigh)*4, red, green, blue, alpha, yFraction*xFraction*weight);
};

ByteRect.prototype.addColorToWeightedSum = function(i, red, green, blue, alpha, weight){
	//let i = (y*this.width+x)*4;
	this.weightedSum[i+RED] += red*weight;
	this.weightedSum[i+GREEN] += green*weight;
	this.weightedSum[i+BLUE] += blue*weight;
	this.weightedSum[i+ALPHA] += alpha*weight;
	this.weight[i+RED] += weight;
	this.weight[i+GREEN] += weight;
	this.weight[i+BLUE] += weight;
	this.weight[i+ALPHA] += weight;
	this.countWeights[i+RED]++;
	this.countWeights[i+GREEN]++;
	this.countWeights[i+BLUE]++;
	this.countWeights[i+ALPHA]++;
};

ByteRect.prototype.getWeightedSum = function(i){
	return (this.weightedSum[i]/this.weight[i])|0.0;
};


/*var lastTimeOf_doGraphicsDtAgeByterectAndMore = 0;

var doGraphicsDtAgeByterectAndMore = function(){
	if(canv == null){
		canv = new FullScreenCanvas(document.body,200,300);
	}
	let now = time();
	let age = now-timeStarted; //how many seconds ago did this page transition start?
	let dt = Math.max(0, Math.min(now-lastTimeOf_doGraphicsDtAgeByterectAndMore, .2));
	lastTimeOf_doGraphicsDtAgeByterectAndMore = now;
	canv.beforePaint();
	doGraphicsDtAgeByterect(dt, age, canv.byteRect, picByteRect);
	canv.afterPaint();
	setTimeout(doGraphicsDtAgeByterectAndMore, 1);
};


window.onload = ()=>{
	timeStarted = time();
	doGraphicsDtAgeByterectAndMore();
};*/



/*
//appends to innerHTML, not replace
var createControlsForAftransInDiv = function(aftrans, div, optionalStep){
	if(!optionalStep) optionalStep = .1;
	let html = '<table border=0><tr><td>';
	let varName = newVar(aftrans);
		let labelId = newId();
	for(let i=0; i<aftrans.length; i++){
		let inner = i%4;
		let outer = (i-inner)/4; //0..4
		if(inner == 0) html += '<br><nobr>\n';
		html += '<input type=number min="-1000" max="1000" step="'+optionalStep+'" oninput="'+varName+'['+i+'] = this.valueAsNumber; dom(\''+labelId+'\').innerHTML = aftransStr('+varName+');" value="'+aftrans[i]+'"></input>';
		if(inner == 3) html += '</nobr>\n';
		//div.innerHTML += '<nobr><input type=range id="'+id+'" min="0" max="1000000" value="'+(fieldValToFraction(firstVal)*1000000)+'"'
		//	+' oninput="let num = '+MUL+'*(Math.pow('+BASE+', between(0,this.valueAsNumber/1000000,1))-1); sim.'+FIELD+' = num; dom(\''+id2+'\').innerHTML = //\''+FIELD+' = \'+num;"></input><label id="'+id2+'">'+FIELD+'='+sim[FIELD]+'</label></nobr><br> ';
	}
	html += '<td><td>';
	//html += '<br><input type=button onclick="" value="copy aftrans to these^, in case something other than these changed it"></input>
	html += '<br><label id='+labelId+'>'+aftransStr(aftrans)+'</label>'; //keep updated as aftransStr(aftrans) if changes from the 16 numberfields
	html += '</td></tr></table>&nbsp;&nbsp;';
	div.innerHTML += html;
};*/

var createNumberChooserForVarName = function(varName, div, optionalStep, onChange){
	let varNameOfOnChange = newVar(onChange);
	let html = '<nobr>'+varName+'=<input type=number min="-1000" max="1000" step="'+optionalStep+'" oninput="'+varName+' = this.valueAsNumber; if('+varNameOfOnChange+') '+varNameOfOnChange+'();" value="'+eval(varName)+'"></input></nobr>';
	div.innerHTML += html;
};

var rememberLabelId_from_createControlsForAftrans4x4InDiv = null;

//appends to innerHTML, not replace
var createControlsForAftrans4x4InDiv = function(aftrans, div, optionalStep, onChange, optionalListOfOtherVars, optionalVarNameOfAftrans){
	if(!optionalStep) optionalStep = .1;
	if(!optionalListOfOtherVars) optionalListOfOtherVars = [];
	if(!optionalVarNameOfAftrans) optionalVarNameOfAftrans = 'theAftrans';
	let html = '<table border=0><tr><td>';
	let varName = newVar(aftrans);
	let varNameOfOnChange = newVar(onChange);
	let labelId = newId();
	if(rememberLabelId_from_createControlsForAftrans4x4InDiv) throw 'already have a rememberLabelId_from_createControlsForAftrans4x4InDiv='+rememberLabelId_from_createControlsForAftrans4x4InDiv;
	rememberLabelId_from_createControlsForAftrans4x4InDiv = labelId;
	for(let i=0; i<4; i++){
		html += '<nobr>';
		for(let j=0; j<4; j++){
			//let inner = i%4;
			//let outer = (i-inner)/4; //0..4
			//if(inner == 0) html += '<br><nobr>\n';
			html += '<input type=number min="-1000" max="1000" step="'+optionalStep+'" oninput="'+varName+'['+i+']['+j+'] = this.valueAsNumber; dom(\''+labelId+'\').innerHTML = aftrans4x4Str('+varName+'); if('+varNameOfOnChange+') '+varNameOfOnChange+'();" value="'+aftrans[i][j]+'"></input>';
			//if(inner == 3) html += '</nobr>\n';
			//div.innerHTML += '<nobr><input type=range id="'+id+'" min="0" max="1000000" value="'+(fieldValToFraction(firstVal)*1000000)+'"'
			//	+' oninput="let num = '+MUL+'*(Math.pow('+BASE+', between(0,this.valueAsNumber/1000000,1))-1); sim.'+FIELD+' = num; dom(\''+id2+'\').innerHTML = //\''+FIELD+' = \'+num;"></input><label id="'+id2+'">'+FIELD+'='+sim[FIELD]+'</label></nobr><br> ';
		}
		html += '</nobr><br>';
	}
	html += '<td><td>';
	//html += '<br><input type=button onclick="" value="copy aftrans to these^, in case something other than these changed it"></input>
	let otherVars = '';
	for(let varNameB of optionalListOfOtherVars) otherVars += ' '+varNameB+' = '+eval(varNameB)+';';
	html += '<br><label id='+labelId+'>'+optionalVarNameOfAftrans+' = '+aftrans4x4Str(aftrans,optionalListOfOtherVars,optionalVarNameOfAftrans)+';'+otherVars+'</label>'; //keep updated as aftransStr(aftrans) if changes from the 16 numberfields
	html += '</td></tr></table>&nbsp;&nbsp;';
	//let rotateHowMuchPerButtonClick = .005;
	let rotateHowMuchPerButtonClick = optionalStep;
	html += '<input type=button onclick="rotate01('+varName+','+rotateHowMuchPerButtonClick+'); dom(\''+labelId+'\').innerHTML = aftrans4x4Str('+varName+'); if('+varNameOfOnChange+') '+varNameOfOnChange+'();" value="rotate01+"></input>';
	html += '<input type=button onclick="rotate01('+varName+','+(-rotateHowMuchPerButtonClick)+'); dom(\''+labelId+'\').innerHTML = aftrans4x4Str('+varName+'); if('+varNameOfOnChange+') '+varNameOfOnChange+'();" value="rotate01-"></input>';
	html += ' <input type=button onclick="rotate12('+varName+','+rotateHowMuchPerButtonClick+'); dom(\''+labelId+'\').innerHTML = aftrans4x4Str('+varName+'); if('+varNameOfOnChange+') '+varNameOfOnChange+'();" value="rotate12+"></input>';
	html += '<input type=button onclick="rotate12('+varName+','+(-rotateHowMuchPerButtonClick)+'); dom(\''+labelId+'\').innerHTML = aftrans4x4Str('+varName+'); if('+varNameOfOnChange+') '+varNameOfOnChange+'();" value="rotate12-"></input>';
	html += ' <input type=button onclick="rotate02('+varName+','+rotateHowMuchPerButtonClick+'); dom(\''+labelId+'\').innerHTML = aftrans4x4Str('+varName+'); if('+varNameOfOnChange+') '+varNameOfOnChange+'();" value="rotate02+"></input>';
	html += '<input type=button onclick="rotate02('+varName+','+(-rotateHowMuchPerButtonClick)+'); dom(\''+labelId+'\').innerHTML = aftrans4x4Str('+varName+'); if('+varNameOfOnChange+') '+varNameOfOnChange+'();" value="rotate02-"></input> ';
	div.innerHTML += html;
};

//used by createControlsForAftransInDiv to refer to js objects in a string of code outside this namespace.
var vars = {};

//Example: let x = newVar(10); eval(x+' = x*x+5;'); eval(x) is 105.
//used by createControlsForAftransInDiv to refer to js objects in a string of code outside this namespace.
var newVar = function(val){
	let id = newId();
	vars[id] = val;
	return 'vars.'+id;
};


var nextIdNum = 0;
//prefix is optional
var newId = function(prefix){
	if(!prefix) prefix = 'id';
	return (prefix+(nextIdNum++));
};

/*let aftransStr = function(aftrans){
	return 'Float32Array.of('+aftrans[0]+', '+aftrans[1]+', '+aftrans[2]+', '+aftrans[3]+', '
		+aftrans[4]+', '+aftrans[5]+', '+aftrans[6]+', '+aftrans[7]+', '
		+aftrans[8]+', '+aftrans[9]+', '+aftrans[10]+', '+aftrans[11]+', '
		+aftrans[12]+', '+aftrans[13]+', '+aftrans[14]+', '+aftrans[15]+')';
};*/

let aftrans4x4Str = function(aftrans, optionalListOfOtherVars, optionalVarNameOfAftrans){
	if(!optionalListOfOtherVars) optionalListOfOtherVars = [];
	if(!optionalVarNameOfAftrans) optionalVarNameOfAftrans = 'theMatrix4x4';
	let html = '';
	let aft = '<nobr>[['+aftrans[0][0]+', '+aftrans[0][1]+', '+aftrans[0][2]+', '+aftrans[0][3]+'],</nobr><br>'
		+'<nobr>['+aftrans[1][0]+', '+aftrans[1][1]+', '+aftrans[1][2]+', '+aftrans[1][3]+'],</nobr><br>'
		+'<nobr>['+aftrans[2][0]+', '+aftrans[2][1]+', '+aftrans[2][2]+', '+aftrans[2][3]+'],</nobr><br>'
		+'<nobr>['+aftrans[3][0]+', '+aftrans[3][1]+', '+aftrans[3][2]+', '+aftrans[3][3]+']]</nobr>';
	let otherVars = '';
	for(let varName of optionalListOfOtherVars){
		console.log('varName='+varName);
		otherVars += ' '+varName+' = '+eval(varName)+';';
	}
	//let labelId = newId();
	if(!rememberLabelId_from_createControlsForAftrans4x4InDiv) throw 'no rememberLabelId_from_createControlsForAftrans4x4InDiv';
	let labelId = rememberLabelId_from_createControlsForAftrans4x4InDiv;
	html += '<br><label id='+labelId+'>'+optionalVarNameOfAftrans+' = '+aft+';'+otherVars+'</label>'; //keep updated as aftransStr(aftrans) if changes from the 16 numberfields
	html = html.replaceAll(';;',';'); //FIXME whats putting the extra ;?
	return html;
};


//https://www3.nd.edu/~pbui/teaching/cse.40166.fa10/slides/Lecture_4_Transformations_and_Matrices.pdf
var aftrans4x4ToRotate01 = angle=>[
	[Math.cos(angle), -Math.sin(angle), 0, 0],
	[Math.sin(angle), Math.cos(angle), 0, 0],
	[0, 0, 1, 0],
	[0, 0, 0, 1]
];

var aftrans4x4ToRotate02 = angle=>[
	[Math.cos(angle), 0, -Math.sin(angle), 0],
	[0, 1, 0, 0],
	[Math.sin(angle), 0, Math.cos(angle), 0],
	[0, 0, 0, 1]
];

var aftrans4x4ToRotate12 = angle=>[
	[1, 0, 0, 0],
	[0, Math.cos(angle), -Math.sin(angle), 0],
	[0, Math.sin(angle), Math.cos(angle), 0],
	[0, 0, 0, 1]
];

var mulAftrans4x4By4x4 = (aftransA,aftransB)=>{
	let aftrans = [[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]];
	for(let i=0; i<4; i++){
		for(let j=0; j<4; j++){
			for(let k=0; k<4; k++){
				aftrans[i][j] += aftransA[i][k]*aftransB[k][j];
			}
		}
	}
	return aftrans;
};

var copyAftrans4x4Into4x4 = (from,to)=>{
	for(let i=0; i<4; i++){
		for(let j=0; j<4; j++){
			to[i][j] = from[i][j];
		}
	}
};

//modifies aftrans
var rotate01 = (aftrans,angle)=>{
	copyAftrans4x4Into4x4(mulAftrans4x4By4x4(aftrans,aftrans4x4ToRotate01(angle)),aftrans);
};

//modifies aftrans
var rotate02 = (aftrans,angle)=>{
	copyAftrans4x4Into4x4(mulAftrans4x4By4x4(aftrans,aftrans4x4ToRotate02(angle)),aftrans);
};

//modifies aftrans
var rotate12 = (aftrans,angle)=>{
	copyAftrans4x4Into4x4(mulAftrans4x4By4x4(aftrans,aftrans4x4ToRotate12(angle)),aftrans);
};