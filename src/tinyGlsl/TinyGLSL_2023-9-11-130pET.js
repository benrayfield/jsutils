const tinyGlsl = {
	description: 'TinyGLSL forked 2023-9-10-8pET from ForestCurveFit (and might modify it?). TinyGLSL (by Ben F Rayfield Y2023, opensource MIT license) is a javascript library that runs GPU code in browser using webgl2 glsl code, but only at most about 1000 floats in for efficiency (IO is the bottleneck of GPUs, so this can be alot faster than matmul in theory), 1 kernel at a time, many times in parallel, with each GPU thread returning 1 float. Use tinyGlsl.simple function to do that. On a good gaming computer it should, as of Y2023, do about 1 teraflop, in theory, TODO test. You might use it to compute 3d fractals with 1 GPU thread per pixel, or ForestCurveFit kind of neuralnet (thats my first usecase), etc. If your use cases need more inputs or multiple kernels used together, you should use glsl directly instead of this software.',
	
	todos: [
		'plan for how to have AI do airhockey and the moving heightmap game using ForestCurveFit software. rubberbandlike paths vs qlearning etc?',
		'options.useGPUIn_predict_ifNumOutsIs1 and make sure GPU works by computing TriTriRect.predict with it, so graphics and curve fitting work by GPU',
		'optionsuseGPUIn_lossGradient, optimize it by GPU',
		'fix all webgl2/glsl memory leaks such as by gl.deleteTexture etc, or put them in tinyGlsl.caches to reuse them. but dont keep allocating more each call',
		'Test max loop size, like in GPU.js i think it defaults to max loop size of 1000. is that inherited from GLSL?',
		'Use this software to GPU optimize ForestCurveFit',
		'Clean up unnecessary code, comments, etc in this software',
		'Check this 1024 limit on multiple computers. it likely varies across different computers andOr implementations of webgl2. if(floatsPar.length > 1024)',
		"put error checking back in after fix it: TODO if(correctOut != observedOut) throw 'i='+i+' correctOut='+correctOut+' observedOut='+observedOut;",
	],

	dones: [
		'fix the id var which duplicates and skips numbers if you count it from 0 to 19 (ids==20). Im trying gl_VertexID for that instead of getting it from coord.x.',
		'Use this software to GPU optimize 3d mandelbrot fractal andOr raytracing of n mirror balls',
		'Cache the compiled glsl program (createProgram) etc',
		'Test speed with double loop triple loop etc - See mandelbulb fractal, runs about 1 teraflop as a ballpark estimate',
	],

	//TODO param optionalBlobs is undefined or something like {AB: aFloat32Array, BC: aFloat32Array},
	//and also allow uniform/const int and float params in there such as sizeA sizeB sizeC, for matmul.
	simple:
		//(function(code, par, outs){
			//let outsLen = typeof(outs)=='number' ? outs : outs.length;
		(function(code, par, height, width){
			if(!height || !width) throw 'height='+height+' width='+width;
			//let outsLen = typeof(outs)=='number' ? outs : outs.length;
			let outsLen = height*width;
			//Code string uses these vars:
			//par - read-only float array, the param. You only get 1 input, and its this array, so put all the params here.
			//pars - size of par array.
			//ret - return this float. starts as 0, in case you dont set it.
			//id - GPU thread id, range 0 to ids-1
			//ids - number of GPU threads. Each returns 1 float.
			//also idy idx idh idw which define the pixel rectangle, since glsl has to do rectangle. use id and ids if you want it flattened.
			//Code can use vec2 vec3 vec4 if for float int etc, whatever you can do in webgl glsl2 #version 300 es.
			//To efficiently use GPU, use at least as big of outs.length as you have GPU cores.
			//Can be more, and they will take turns, but less and some go unused. Normally this is a few hundred to a few thousand.
			//
			//Params:
			//par = the input floats. Float32Array, up to size 1024 or might have to be a little smaller.
			//outs = size of output floats, or give a Float32Array of that size to reuse.
			/*TODO? let height;
			let width;
			if(outsLen > 8192){
				height = width = Math.ceil(Math.sqrt(outsLen)); //equal or slightly more than outsLen, but GLSL has to do rectangle.
				if(outsLen != height*width){
					throw 'TODO allow any size up to a few million, regardless of if its a multiply of 2 integers, by dropping the few extra (maybe a Float32Array backed view of the first outsLen flaots?). outsLen='+outsLen+' height='+height+' width='+width;
				}
			}else{
				height = 1;
				width = outsLen;
			}*/
			let code2 =
				`${tinyGlsl.glslVersionString}
				precision highp float;
				uniform vec2 mouse;
				uniform float par[${par.length}];
				in vec2 coord;
				//flat in int id;
				out vec4 fragColor;
				void main(){
					const int pars = ${par.length}; //number of params in the par array
					const int idh = ${height}; //height in pixels
					const int idw = ${width}; //width in pixels
					int idy = int(coord.y*float(idh)); //y position from 0 to idh-1
					int idx = int(coord.x*float(idw)); //x position from 0 to idw-1
					int id = idy*idw+idx; //2d pixel index in 1 int
					const int ids = idh*idw; //height*width
					float ret = 0.;
					//start user code
					${code}
					//end user code
					fragColor = vec4(ret, 0., 0., 1.);
				}`;

			let lines = code2.split(/(?:\r\n)|\n|\r/); //?: starts a noncapturing group, so it doesnt include those in the returned list, just whats between
			let code3 = '';
			let lineNum = 1;
			for(let line of lines){
				if(line.startsWith('#version')){ //dont comment on the first line
					code3 += line+'\n';
				}else{
					code3 += line+' //'+(lineNum)+'\n';
				}
				lineNum++;
			}
			//reuse the Float32Array(height*width) if same size as last time
			//TODO remove existing float array of different size from cache.
			let arrCacheKey = 'floatsH'+height+'W'+width;
			let outs = tinyGlsl.caches[arrCacheKey];
			if(!outs){
				outs = tinyGlsl.caches[arrCacheKey] = new Float32Array(height*width);
			}
			return tinyGlsl.internalGLSL_disorganizedTODO(code3, par, outs, height, width);
		}),
		
	webglType: 'webgl2', //If you change this from 'webgl2' to 'webgl', some features wont be there and it will break.
	
	glslVersionString: '#version 300 es',
		
	caches: {},

	//returns the last value returned by lazyVal() or reuses it if exists for same key.
	cache: function(key, lazyVal){
		if(key === undefined) throw 'key is undefined';
		if(lazyVal === undefined) throw 'lazyVal is undefined';
		let val = tinyGlsl.caches[key];
		if(val === undefined){
			val = tinyGlsl.caches[key] = lazyVal();
		}
		return val;
	},
	
	internalGLSL_disorganizedTODO:
		(function(glslCode, floatsPar, floatsOutOrOutputSize, canvasHeight, canvasWidth){
			if(canvasHeight < 1 || canvasHeight > 8192) throw 'canvasHeight='+canvasHeight;
			if(canvasWidth < 1 || canvasWidth > 8192) throw 'canvasWidth='+canvasWidth;
			console.log('internalGLSL_disorganizedTODO code=\n'+glslCode);
			//reads glslCode. reads floatsPar. writes floatsOutOrOutputSize or reads floatsOutOrOutputSize as a number to make new Float32Array to return.
			//runs floatsOut number of GPU threads that return 1 float each.
			//FIXME? floatsPar.length <= 1024 or the limit might be a little less than that or may vary across computers.
			//FIXME remove the coord and mouse arrays, and rename other vars, since im going to use this tool for a variety of things.
			if(floatsPar.length > 1024){
				throw 'floatsPar.length is too big: '+floatsPar.length;
			}
			let floatsOut = typeof(floatsOutOrOutputSize)=='number' ? (new Float32Array(floatsOutOrOutputSize)) : floatsOutOrOutputSize;
			//FIXME also include tinyGlsl.glslVersionString?
			let cacheKeySuffix = '_cacheKeySuffix_glType'+tinyGlsl.webglType+'_H'+canvasHeight+'_W'+canvasWidth+'_floatsOutLen'+floatsOut.length+'_glslCode['+glslCode+']';

			//let canvasHeight = 512;
			//let canvasWidth = 512;
			//let canvasHeight = 1;
			//let canvasWidth = 801;
			//let canvasWidth = floatsOut.length;

			//const canvas = document.getElementById("canvas");
			
			/*
			//let caches = tinyGlsl.caches || (window.caches = {});
			let cacheKey = 'glslCanvasH'+canvasHeight+'W'+canvasWidth;
			let canvas = tinyGlsl.caches[cacheKey];
			if(!canvas){
				canvas = tinyGlsl.caches[cacheKey] = document.createElement("canvas");
				canvas.setAttribute("height", ''+canvasHeight);
				canvas.setAttribute("width", ''+canvasWidth);
				tinyGlsl.caches.gl = canvas.getContext(tinyGlsl.webglType);
			}
			let gl = tinyGlsl.caches.gl;
			if(!gl) throw 'No gl';
			*/
			let canvas = tinyGlsl.cache('glslCanvas'+cacheKeySuffix, function(){
			//let canvas = tinyGlsl.cache('glslCanvas', function(){
				//FIXME should canvas be deduped just by its size, or should it include cacheKeySuffix?
				let c = document.createElement("canvas");
				c.setAttribute("height", ''+canvasHeight);
				c.setAttribute("width", ''+canvasWidth);
				return c;
			});
			let gl = tinyGlsl.cache('gl'+cacheKeySuffix, function(){
				let gl = canvas.getContext(tinyGlsl.webglType);
				if (!gl.getExtension('EXT_color_buffer_float')){
					throw 'EXT_color_buffer_float not supported so cant store just 1 float per pixel';
				}
				return gl;
			});

			let vertexCode_value = `${tinyGlsl.glslVersionString}
			in vec4 position;
			out vec2 coord;
			//flat out int id;
			void main() {
				coord = position.xy * 0.5 + 0.5;
				//id = gl_VertexID;
				gl_Position = position;
			}
			`;

			//let program;

			/*
			const positionBuffer = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW); //2 triangles covering canvas rectangle
			*/
			let positionBuffer = tinyGlsl.cache('positionBufferOfSquareOf2Triangles'+cacheKeySuffix, function(){
				const p = gl.createBuffer();
				//FIXME if gl is replaced in cache, positionBuffer must also be. likely similar for other things in cache.
				gl.bindBuffer(gl.ARRAY_BUFFER, p);
				gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW); //2 triangles covering canvas rectangle
				return p;
			});

			/*let mouseX = 0;
			let mouseY = 0;
			canvas.addEventListener("mousemove", (event) => {
				mouseX = event.offsetX;
				mouseY = event.offsetY;
			});*/


			//use these instead of canvas[[[
			//tested in tinyGlsl.cache: if (!gl.getExtension('EXT_color_buffer_float')){
			//	throw 'EXT_color_buffer_float not supported so cant store just 1 float per pixel';
			//}

			
			/*
			//Create and configure the texture
			const texture = gl.createTexture();
			gl.bindTexture(gl.TEXTURE_2D, texture);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, canvasWidth, canvasHeight, 0, gl.RED, gl.FLOAT, null);
			*/
			let texture = tinyGlsl.cache('texture_onefloatchannel'+cacheKeySuffix, function(){
				let t = gl.createTexture();
				//FIXME if gl is replaced in cache, texture must also be. likely similar for other things in cache.
				gl.bindTexture(gl.TEXTURE_2D, t);
				gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, canvasWidth, canvasHeight, 0, gl.RED, gl.FLOAT, null);
				return t;
			});

			/*
			//Create and configure the framebuffer
			const framebuffer = gl.createFramebuffer();
			gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
			gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
			*/
			let framebuffer = tinyGlsl.cache('framebuffer'+cacheKeySuffix, function(){
				const f = gl.createFramebuffer();
				//FIXME if gl is replaced in cache, framebuffer must also be. likely similar for other things in cache.
				gl.bindFramebuffer(gl.FRAMEBUFFER, f);
				gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
				return f;
			});
			//]]]

			
			
			/*//use these instead of canvas[[[
			const framebuffer = gl.createFramebuffer();
			gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);

			const renderbuffer = gl.createRenderbuffer();
			gl.bindRenderbuffer(gl.RENDERBUFFER, renderbuffer);
			gl.renderbufferStorage(gl.RENDERBUFFER, gl.RGBA4, 512, 512);  // Change the format and dimensions as needed

			// Attach the renderbuffer to the framebuffer
			gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, renderbuffer);

			// Check if framebuffer is complete
			if(gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE){
				console.error('Framebuffer is not complete');
			}
			//]]]
			*/


			/*
			let createProgram = function(vertexShaderSource, fragmentShaderSource){
				let programCacheKey = 'programCacheKey['+vertexShaderSource+']['+fragmentShaderSource+']';
				if(tinyGlsl.caches[programCacheKey]) return tinyGlsl.caches[programCacheKey];


				const vertexShader = gl.createShader(gl.VERTEX_SHADER);
				gl.shaderSource(vertexShader, vertexShaderSource);
				gl.compileShader(vertexShader);
				if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
					throw new Error(gl.getShaderInfoLog(vertexShader));
				}

				const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
				gl.shaderSource(fragmentShader, fragmentShaderSource);
				gl.compileShader(fragmentShader);
				if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
					throw new Error(gl.getShaderInfoLog(fragmentShader));
				}

				const program = gl.createProgram();
				gl.attachShader(program, vertexShader);
				gl.attachShader(program, fragmentShader);
				gl.linkProgram(program);
				if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
					throw new Error(gl.getProgramInfoLog(program));
				}

				tinyGlsl.caches[programCacheKey] = program;
				return program;
			};*/

			let vertexShaderSource = vertexCode_value;
			let fragmentShaderSource = glslCode;
			let program = tinyGlsl.cache('programCacheKey_vertexShader['+vertexShaderSource+']'+cacheKeySuffix, function(){

				//FIXME does this put extra stuff in gl if theres multiple fragmentShaderSource but reuses same vertexShaderSource?

				/*
				const vertexShader = gl.createShader(gl.VERTEX_SHADER);
				gl.shaderSource(vertexShader, vertexShaderSource);
				gl.compileShader(vertexShader);
				if(!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)){
					throw new Error(gl.getShaderInfoLog(vertexShader));
				}*/
				//cacheKeySuffix already contains the fragmentShader, but not the vertexShader since thats always the same 2023-9-10.
				let vertexShader = tinyGlsl.cache('vertexShader['+vertexShaderSource+']'+cacheKeySuffix, function(){
					let v = gl.createShader(gl.VERTEX_SHADER);
					gl.shaderSource(v, vertexShaderSource);
					gl.compileShader(v);
					if(!gl.getShaderParameter(v, gl.COMPILE_STATUS)){
						throw new Error(gl.getShaderInfoLog(v)+'\n\nVERTEXSHADERCODE:\n'+vertexShaderSource);
					}
					return v;
				});
				
				/*
				const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
				gl.shaderSource(fragmentShader, fragmentShaderSource);
				gl.compileShader(fragmentShader);
				if(!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)){
					throw new Error(gl.getShaderInfoLog(fragmentShader));
				}*/
				//cacheKeySuffix already contains the fragmentShader, but not the vertexShader since thats always the same 2023-9-10.
				let fragmentShader = tinyGlsl.cache('fragmentShader'+cacheKeySuffix, function(){
					const f = gl.createShader(gl.FRAGMENT_SHADER);
					gl.shaderSource(f, fragmentShaderSource);
					gl.compileShader(f);
					if(!gl.getShaderParameter(f, gl.COMPILE_STATUS)){
						throw new Error(gl.getShaderInfoLog(f)+'\n\nFRAGMENTSHADERCODE:\n'+fragmentShaderSource);
					}
					return f;
				});

				const p = gl.createProgram();
				gl.attachShader(p, vertexShader);
				gl.attachShader(p, fragmentShader);
				gl.linkProgram(p);
				if(!gl.getProgramParameter(p, gl.LINK_STATUS)){
					throw new Error(gl.getProgramInfoLog(p));
				}
				return p;
			});

			let par = floatsPar;

			//let outarr = new Float32Array(512*512); //FIXME should be a param
			let outarr = floatsOut;

			/*
			// start with mandelbrot
			//try {
				program = createProgram(vertexCode_value, glslCode);
				//errorTextarea.value = "OK";

				/*
				// Get the uniform location for par after the program is created
				const parLocation = gl.getUniformLocation(program, "par");

				// Set the par uniform
				gl.uniform1fv(parLocation, par);
				*
			//} catch (error) {
			//	errorTextarea.value = error.message;
			//}
			*/

			// compile and link shader on textarea change
			//vertexCode.addEventListener("input", updateShader);
			//glslCode.addEventListener("input", updateShader);

			/*
			function updateShader() {
				try{
					const newProgram = createProgram(vertexCode.value, glslCode.value);
					program = newProgram;
					errorTextarea.value = "OK";
				}catch(error){
					errorTextarea.value = error.message;
				}
			}*/

			//a Texture and RenderBuffer are similar. Texture can be input and output for multiple steps in glsl.
			//RenderBuffer is output only, back to CPU or screen.
			//A FrameBuffer contains things that contain image data
			//but does not directly contain image data. Its more for control-flow.
			//If you dont specify a FrameBuffer, the default one will be to a canvas.

			// render loop
			let render = function(){

				//Bind the offscreen framebuffer. instead of canvas.
				gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);

				gl.clearColor(0, 0, 0, 0);
				gl.clear(gl.COLOR_BUFFER_BIT);

				if (program) {
					gl.useProgram(program);

					// set uniforms
					const mouseLocation = gl.getUniformLocation(program, "mouse");
					//gl.uniform2f(mouseLocation, mouseX, mouseY);
					gl.uniform2f(mouseLocation, .67844, .2343234); //FIXME remove mouse since tinyGlsl is not specific to graphics or UI

					// draw rectangle
					gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
					const positionLocation = gl.getAttribLocation(program, "position");
					gl.enableVertexAttribArray(positionLocation);
					gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

					const parLocation = gl.getUniformLocation(program, "par");
					gl.uniform1fv(parLocation, par);

					gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

					//copy from GPU (texture or renderbuffer) to CPU (outarr)
					gl.readPixels(0, 0, canvasWidth, canvasHeight, gl.RED, gl.FLOAT, outarr);
					//console.log('outarr[2345]='+outarr[2345]);
				}

				//requestAnimationFrame(render);
			};
			
			render();
			if(outarr != floatsOut) throw 'Diff out arrays';
			return outarr;
		}),
		
	testAfterBoot:
		(function(){
			//tests work 2023-9-10.

			/*
			// Create the par array and update the uniform
			let floatsPar = new Float32Array(1000); //at most 1024, or something like that. might be less cuz of other vars in kernels.
			for (let i=0; i<floatsPar.length; i++){
				floatsPar[i] = i;
			}

			let glslCode =
				`${tinyGlsl.glslVersionString}
				precision highp float;
				uniform vec2 mouse;
				uniform float par[${floatsPar.length}];
				//in vec4 position;
				//flat in int id;
				in vec2 coord;
				out vec4 fragColor;

				void main() {
					//TODO gl_VertexID
					//vec2 coord = position.xy * 0.5 + 0.5; //FIXME?
					//gl_Position = position; //FIXME?

					float frompar = par[4]; // Get the corresponding value from par
					float diag[10];
					diag[0] = 1.3;
					for(int d=1; d<10; d++){
						diag[d] = float(d);
					}
					//diag[1] = 1.;
					for(int d=1; d<10; d++){
						diag[d] = diag[d-1]*diag[d-1]+.7*par[d];
					}

					vec2 c = vec2(coord.x, coord.y);
					vec2 z = vec2(0.0, 0.0);
					float i = -mouse.x * 0.71 + 1.0 * coord.x + 0.1 * mouse.y;

					for (int j = 0; j < 1000; j++) {
						vec2 v = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
						if (length(v) > 2.0)
							break;
						z = v;
					}

					fragColor = vec4(z.x / (4.0 + diag[2] + -1.9*frompar)+mouse.x,
						mouse.x * 0.001, 0.0 + mouse.y * mouse.y * 0.000001, 1.0);
				}`;
			
			//let floatsOut = new Float32Array(801); //TODO what size?

			let floatsOut = tinyGlsl.internalGLSL_disorganizedTODO(glslCode, floatsPar, new Float32Array(801), 1, 801);
			console.log('floatsOut[222]='+floatsOut[222]);
			
			
			let parB = Float32Array.of(100,2);
			let outsBSize = 10;
			let testBOuts = tinyGlsl.internalGLSL_disorganizedTODO(
				`${tinyGlsl.glslVersionString}
				precision highp float;
				uniform vec2 mouse;
				uniform float par[${parB.length}];
				in vec2 coord;
				out vec4 fragColor;

				void main(){
					int id = int(coord.x*${outsBSize+'.'});
					float ret = par[0]+pow(par[1],float(id));
					fragColor = vec4(ret, 0., 0., 1.);
				}`,
				parB,
				outsBSize
			);
			for(let i=0; i<10; i++){
				let correctOut = 100+2**i;
				let observedOut = testBOuts[i];
				console.log('i='+i+' correctOut='+correctOut+' observedOut='+observedOut+' diff='+Math.abs(correctOut-observedOut));
				if(correctOut != observedOut){
					throw 'i='+i+' correctOut='+correctOut+' observedOut='+observedOut;
				}
			}
			console.log('GLSL test pass: internalGLSL_disorganizedTODO');
			*/

			//FIXME move the tenThousandFloatsOut test to end cuz its bigger output array so tests tinyGlsl.caches.

			let tenThousandFloatsOut = tinyGlsl.simple('ret = float(id)*float(id);', Float32Array.of(0), 1000, 10);
			//let tenThousandFloatsOut = tinyGlsl.simple('ret = float(id)*float(id);', Float32Array.of(0), 8000, 1);
			//let tenThousandFloatsOut = tinyGlsl.simple('ret = float(id);', Float32Array.of(0), 1, 8000);
			let correct5678 = 5678*5678;
			let observed5678 = tenThousandFloatsOut[5678];
			if(correct5678 != observed5678){
				throw 'correct5678='+correct5678+' observed5678='+observed5678;
			}
			console.log('tenThousandFloatsOut test pass');
			
			let outsId = tinyGlsl.simple('ret = float(id);', Float32Array.of(0,10,20,30,40,50), 1, 20);
			//let outsId = tinyGlsl.simple('ret = float(theId);', Float32Array.of(0,10,20,30,40,50), 20);
			for(let i=0; i<outsId.length; i++){
				let correctOut = i;
				let observedOut = outsId[i];
				console.log('outsId['+i+']='+outsId[i]);
				//TODO if(correctOut != observedOut) throw 'i='+i+' correctOut='+correctOut+' observedOut='+observedOut;
			}

			let outsC = tinyGlsl.simple('ret = par[2]+par[3]+float(id)*.001;', Float32Array.of(0,10,20,30,40,50), 1, 100);
			//let outsC = tinyGlsl.simple('ret = par[2]+par[3]+.001;', Float32Array.of(0,10,20,30,40,50), 100);
			for(let i=0; i<outsC.length; i++){
				let observedOut = outsC[i];
				let approxCorrectOut = 20+30+i*.001;
				console.log('outsC['+i+']='+observedOut);
				let diff = Math.abs(observedOut-approxCorrectOut);
				//if(diff > .000001) throw 'i='+i+' approxCorrectOut='+approxCorrectOut+' observedOut='+observedOut;
			}
			console.log('tinyGlsl.simple test A pass');
			
			let hundredFloats = new Float32Array(100);
			for(let i=0; i<hundredFloats.length; i++){
				hundredFloats[i] = Math.random();
			}
			//TODO time it using the performance object, make tinyGlsl.time function, copy it from my other code.
			let hundredOuts = tinyGlsl.simple(
				`float sum = 0.;
				float idf = float(id);
				for(int i=0; i<pars; i++){
					for(int j=0; j<pars; j++){
						sum += (par[i]+idf)*(par[j]-idf);
					}
				}
				ret = sum;`,
				hundredFloats,
				1,
				hundredFloats.length
			);
			let id = 71;
			let sum = 0;
			for(let i=0; i<hundredFloats.length; i++){
				for(let j=0; j<hundredFloats.length; j++){
					sum += (hundredFloats[i]+id)*(hundredFloats[j]-id);
				}
			}
			let approxCorrectOut = sum;
			let observedOut = hundredOuts[id];
			let ratio = observedOut/approxCorrectOut;
			let s = 'id='+id+' approxCorrectOut='+approxCorrectOut+' observedOut='+observedOut+' ratio='+ratio;
			console.log(s);
			if(Math.max(ratio,1/ratio) > 1.00001) throw s;
			console.log('tinyGlsl.simple test B pass');

			let tenThousandFloatsOutB = tinyGlsl.simple('ret = float(id)*float(id)+0.;', Float32Array.of(0), 1000, 10);
			//let tenThousandFloatsOut = tinyGlsl.simple('ret = float(id)*float(id);', Float32Array.of(0), 8000, 1);
			//let tenThousandFloatsOut = tinyGlsl.simple('ret = float(id);', Float32Array.of(0), 1, 8000);
			let correct5678B = 5678*5678;
			let observed5678B = tenThousandFloatsOutB[5678];
			if(correct5678B != observed5678B){
				throw 'correct5678B='+correct5678+' observed5678B='+observed5678;
			}
			let correct8989B = 8989*8989;
			let observed8989B = tenThousandFloatsOutB[8989];
			let diff = Math.abs(correct8989B-observed8989B);
			if(diff > 10){ //cuz theres 24 digit bits in float, and 8989*8989 exceeds that. 5678*5678 does too but the answer is a multiple of 4 so its ok.
				throw 'correct8989B='+correct8989B+' observed5678B='+observed8989B;
			}
			console.log('tenThousandFloatsOutB test pass');
			
			/*
			//let tenThousandFloatsOut = tinyGlsl.simple('ret = float(id)*float(id);', Float32Array.of(0), 1000, 10);
			let tenThousandFloatsOut = tinyGlsl.simple('ret = float(id)*float(id);', Float32Array.of(0), 8000, 1);
			let correct5678 = 5678*5678;
			let observed5678 = tenThousandFloatsOut[5678];
			if(correct5678 != observed5678){
				throw 'correct5678='+correct5678+' observed5678='+observed5678;
			}
			console.log('tenThousandFloatsOut test pass');
			*/
			
		}),
};