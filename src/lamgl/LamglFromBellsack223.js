const Lamgl = window.Lamgl = (() => {
	/* LamGL is opensource MIT by Ben F Rayfield, a GPU API that runs in browsers.
	It comes after TinyGLSL, upgrades to do calculations in GPU memory without copying to CPU. Stores tensors
	in WebGLTexture's. Call GPU as a single function Lamgl({...})=>{...}.
	https://github.com/benrayfield/jsutils/blob/master/src/lamgl/LamglFromBellsack077.js
	https://github.com/benrayfield/jsutils/blob/master/src/lamgl/Lamgl_028.html
	LamGL.js is like GPU.js but without the overhead of copying back to CPU. You can have pointers into GPU memory like in tensorflow.js, but with the generality of GPU.js, and more low level as you type or generate the GLSL code.
	
	Bellsack and Lamgl are NOT under the OpenAI license because that license grants
	nonexclusive copyright: "We hereby assign to you all our right, title, and interest,
	if any, in and to Output." Nonexclusive "We may use Content to". I can opt out of Services section.
	https://github.com/benrayfield/jsutils/blob/master/src/bellsack/NotUnderOpenAILicenseBecause_2025-7-10.png


	Have bell_5. TODO bell_13 with radius replaced by a mat3 (3x3 rotation) or radius_and_quaternion, which is enuf to make skatepark shapes with.
	Make that one of the "species". A fractal can be a species too.

	
	if u call Lamgl with the same sh/shape, sv vertex shader code string, and sf fragment shader code string, it will call the already JIT compiled GPU stuff from the first call of it. Its returning sometimes as fast as 1/10000 second.
	
	maybe I should make it take an optional WebGL2 as a param Lamgl=MakeLamgl(...hand it a WebGL2 from an existing canvas...);
	

	Opensource MIT by Ben F Rayfield. LamGL, open browser console. TODO hook in VarTree.html/VarTree.jsp
	which code to call LamGL will be in the tree (.big fields). All this together will remake BellSack and
	scale it up to 30 species near each area and swapping in/out species as you move around the massively
	multiplayer 3d world. LOOK IN BROWSER CONSOLE FOR "test pass" or errors.

	Avoid these bugs in WebGL2 GLSL ES 300:
	-- If you texelFetch the same address twice in the same GPU thread, you'll get all 0s.
	[This is a known bug-like behavior (especially on certain GPUs and drivers, notably Intel and some mobile chipsets), and it boils down to this: In WebGL2 / GLSL ES 300, if you call texelFetch() multiple times with the same coordinates and sampler in the same shader invocation — even if in different scopes — you may get all 0.0s as the result on the second+ calls. This isn't defined behavior by the spec, but it's a real-world GPU driver optimization bug.]--GPT.
	-- Some GLSL optimizers are buggy so u have to make sure some code happens like this sometimes:
		//*1.0000001 avoid returning all 0s, force it to to do some calculation
		//thats not from the textures, cuz the glsl optimizer is buggy.
		dot(mul,texelFetch(matCB,ivec2(b,idx*4+3),0))*1.0000001

	2025-5-4 did this just reach 1 teraflop/sec when turned off observed_testMatmulAC4?
	testMatmulAC4 secs=0.10042023658752441 gigaflopPerSec(TODO get this up to 100 like in TinyGLSL)=2.6731211269955195 observed_testMatmulAC4.length=262144 Lamgl_038.html:1408:13
	testMatmulAC4 secs=0.047499895095825195 gigaflopPerSec(TODO get this up to 100 like in TinyGLSL)=5.651285238808727 observed_testMatmulAC4.length=262144 Lamgl_038.html:1408:13
	testMatmulAC4 secs=0.04397988319396973 gigaflopPerSec(TODO get this up to 100 like in TinyGLSL)=6.103596383284764 observed_testMatmulAC4.length=262144 Lamgl_038.html:1408:13
	testMatmulAC4 secs=0.05035996437072754 gigaflopPerSec(TODO get this up to 100 like in TinyGLSL)=5.330334509847906 observed_testMatmulAC4.length=262144 Lamgl_038.html:1408:13
	testMatmulAC4 secs=0.049179792404174805 gigaflopPerSec(TODO get this up to 100 like in TinyGLSL)=5.4582470335359305 observed_testMatmulAC4.length=262144 Lamgl_038.html:1408:13
	testMatmulAC4 secs=0.00036025047302246094 gigaflopPerSec(TODO get this up to 100 like in TinyGLSL)=745.1356100877723 observed_testMatmulAC4.length=undefined Lamgl_038.html:1408:13
	testMatmulAC4 secs=0.0002598762512207031 gigaflopPerSec(TODO get this up to 100 like in TinyGLSL)=1032.9356943510313 observed_testMatmulAC4.length=undefined Lamgl_038.html:1408:13
	testMatmulAC4 secs=0.00028014183044433594 gigaflopPerSec(TODO get this up to 100 like in TinyGLSL)=958.2126866745737 observed_testMatmulAC4.length=undefined Lamgl_038.html:1408:13
	testMatmulAC4 secs=0.0002799034118652344 gigaflopPerSec(TODO get this up to 100 like in TinyGLSL)=959.0288814673117 observed_testMatmulAC4.length=undefined Lamgl_038.html:1408:13
	testMatmulAC4 secs=0.00024008750915527344 gigaflopPerSec(TODO get this up to 100 like in TinyGLSL)=1118.073393090987 observed_testMatmulAC4.length=undefined
	...
	something dont seem right here. maybe its just that im not refilling the input matrixs so it doesnt have to move them around GPU memory as much, but its saying 21 teraflops when i raised to multiplying 2 1024x1024 matrixs: secs=0.00009989738464355469 gigaflopPerSec=21496.89559604
		
	2025-5-4-950aET about doBasicTests matmul tests only[[
	Are you recompiling the shader every call?
	no
	let program = vm.cache('program'+cacheKeySuffix, function(){...
	lazyevals it once

	 Are you recreating textures or frameBuffers every call?
	I was but i just fixed that (see .free() in finally block in new code im not giving u yet) and its a little faster but still taking 40ms.

	Are you doing gl.readPixels() after every run?
	yes.its for testing but i guess i shouldnt do that in the speed test

	Are you uploading data from CPU to GPU every time?
	no. it stays in the 2 input textures/tensors.

	 Are you allocating a new canvas or GL context?
	no

	Are you doing unnecessary conversions (e.g., CPU reshape / flatten)?
	no, not in the loop, only before it, and those tests in the loop are still slow. I expect the first 1 to be slow but not those after it.

	Are you launching too many threads or using poor loop structure?
	TinyGLSL is fast even with a million GPU threads. im only using 512*512/4=64k gpu threads which should be ok.
	]]

	The shit i gotta do for pointer-arithmetic to write a GPU memory address with a vec4 value (i do have random-access swarming many vec4 sized particles: gl_Position = vec4((float(idx)+.5)/float(width)*2.-1., (float(idy)+.5)/float(height)*2.-1., 0., 1.0);
	i can read alot faster than i can write in GPU. i read as much as the 3d cube volume of matrix multiplying 2 2d squares or any 3 lengths of a 3d rectangle of compute returning a 2d matrix. they're all tensors.
	cuz i dont gotta do that affine transform shit to read. only to write. to read i just texelFetch an ivec2, which can be generated in simple easy to optimize ways or loaded at runtime and i can jump pointer arithmetic n levels deep at each point depending on reading shared GPU mem.
	im gonna turn this into something like codeblocks in a massively multiplayer way, and i'm not giving up GPU flops for it but i am giving up some IO bandwidth between CPU vs GPU cuz of browser layers etc. But imagine u can call pure-functions on eachother in an ocean of builders. (but not codeblocks specificly im optimizing for DAG which has immutable forest of childs, like in wikibinator203's tree drag and drop).
	float32 (even with the +1 in first shader and -1 in last shader, to fix an optimizer bug built into the drivers or browser or hardware etc) can exactly do int25 and uint24, if ur careful not to overflow it, so u might need to multiply 2 int12s or something like that.
	
	Params of the Lamgl javascript function such as (bellPositions, camPos, horizon, etc). Those are not built in. Whatever code string goes in sv and sf (shaders) has some var names,
	and you pass tensors or float32arrays or numbers in the Lamgl call.
	When you pass tensors into Lamgl, that were returned by earlier calls of Lamgl (all immutable), that is pointers into GPU memory. It doesnt copy it back to CPU unless you tell it to, so its nearly as fast as native GPU code in some cases.
	Lamgl can do a few thousand sequential calls per second on a good gaming computer, so maybe you get 50 of them per video frame to build whatever you want. You can keep them around to use less often in sparse combos too. dont forget to free them.
	if u wanna double buffer, u can do so with each buffer state being immutable, using only 2 actual WebGLTexture's (Lamgl handles that, u dont gotta touch that low level detail) as long as you free the oldest of the 2 tensors then make its tensor replacement. same ptr into GPU.
	You read tensors by texelFetch or texture which is the only place WebGL is letting me store memory between GPU calls. You just expect the texture to be there if you write a variable for it in the shader code and give it as a param in Lamgl({...glVarName: tensorVal etc}). can mat4
	You have random-access to read all params including	blocks of GPU memory up to at least 16mB (some GL's have more). You read a vec4 (4 floats) at a (x,y) or i can make a function to take an int. You write up to 8 vec4s but only at 1 int/(x,y), 1 per output tensor.
	that is, you write up to 8 vec4's per GPU thread / gl_VertexID. That could potentially be millions of threads since WebGL is designed to run 1 GPU thread per pixel normally, and it can also do voxels and thats how u can random-access write but only 1 address written per thread.
	Lamgl was designed to use headless GL, no canvas in the dom tree. Canvas was added later by tensor.copyTo(canvasDomNode). Lamgl matrix multiplied before it could display pixels on screen. Its normal use is off screen, and whenever u want, pick any tensor and tensor.display().
	
	Among GPU APIs, its recommended: If WebGL falls, retreat to OpenCL.
	If OpenCL falls retreat to WebGPU. Join OpenCL to Tomcat by 1 JSP or servlet and my https://github.com/benrayfield/LazyCL at gaming-low-lag.
	*/
	const vm = function(){}; //Proxy of this (Lamgl) can only be called as function if this is a function
	//VM = vm;
	
	const Todo = vm.Todo = str => { throw new Error(str || 'TODO'); };
	const Err = vm.Err = str => { throw new Error(str || '(Err with no message)'); };

	vm.jsType = x => (ArrayBuffer.isView(x) ? x.constructor.name : typeof(x));

	vm.call = (param,optionalSh)=>{
		//console.log('Lamgl called.');
		//if(typeof(param) == 'object'){
		if(param.sv || param.sf){
			return vm.callGPU(param);
		}else{
			return vm.wrap(param,optionalSh);
		}
	};
	
	vm.callGPU = map=>{
		let gl = vm.Gl();
		let sv = map.sv || '//FIXME no sv'; //vertex shader code
		let sf = map.sf || '//FIXME no sf'; //fragment shader code
		//If sc is true (or 1) then output to Lamgl.glCanv instead of a frameBuffer, by giving null frameBuffer.
		//There is only 1 canvas a WebGL2 instance can output to efficiently, and thats the canvas it was created from.
		//This is normally only used in Lamgl.Tensor.copyTo(Lamgl.glCanv) which is called by Lamgl.Tensor.display().
		let sc = !!map.sc;
		
		if(opt.logShaderCodeEveryTime){
			console.log('sv='+sv);
			console.log('sf='+sf);
			console.log('sc='+sc);
		}
		
		let sh = map.sh; //[height, width, 4] or maybe [zSize, height, width, 4] etc
		/*
		//TODO zSize for 3d pics?
		let h = map.h; //height, unless map.n is a [] list like [height width 4] or [zSize height width 4] etc.
		let w = map.w; //width, unless that
		let q = map.q || 4; //floats per GPU thread (or maybe per texture?)
		let sh = map.sh || [h, w, q]; //shape of tensor
		//in case there is zSize or what should it be called?
		if(!h) h = sh[n.length-3];
		if(!w) w = sh[n.length-2];
		if(!q) w = sh[n.length-1];
		*/
		
		let cacheKeySuffix = '_SV['+sv+']_SF['+sf+']_SH['+vm.Str(sh)+']';
		
		let glvars = vm.glvars(map);
		if(opt.logGlvars && !opt.logGlvarsDetail) console.log('glvars=[[['+glvars.join('\n')+']]]');
		if(opt.logGlvarsDetail) console.log(
			'<<<\nmap.sf='+map.sf+'\nglvars=[[['+glvars.map(x=>(x+' ('+map[x.shaderType].substring(x.charPtrFrom,x.charPtrTo)+')')).join('\n')+']]]\n>>>');
		
		// ── geometry auto-detect: if shader declares “in vec2 XY;” draw a quad
		//const hasXYAttr = glvars.some(v=>(v.memType==='in' && v.name==='XY' && v.glType.startsWith('vec2')));
		//
		//If hasXYAttr, then do 2 triangles to fill height x width, else only use gl_VertexID (tho can use both),
		//and it will come in the usual gl screen coordinates of x and y each range -1 to 1.
		const hasXYAttr = glvars.some(v=>(v.memType=='in' && v.name=='XY' && v.glType=='vec2'));
		const has_gl_VertexID = sv.includes('gl_VertexID'); //FIXME parse it better like what if its "int not_gl_VertexID".
		//No, cant do this, cuz gl_VertexID is with TRIANGLES not POINTS so theres too few of them: Allow this 2025-7-13+ cuz of using XY and VarGradientGL at same time.
		if(hasXYAttr && has_gl_VertexID){
			Err('hasXYAttr && has_gl_VertexID, but if you do that youll only get the corners of the 2 triangles forming a rectangle, not the every pixel in that rectangle you were expecting, sv['+sv+']');
		}
		if(!hasXYAttr && !has_gl_VertexID){
			console.log('Youre probably just testing simple stuff in 1 GPU thread. !hasXYAttr && !has_gl_VertexID. You normally do one or the other. Add "in vec2 XY;" for 2 triangles covering the rectangle heightXwidth, or use gl_VertexID (an int) in sv aka vertex shader code string. sv['+sv+']');
		}
		
		//If a memsIn's Tensor has fr/free of 1, then it uses an optimization of
		//its WebGLTexture being both in and out (in memsIn and memsOut)
		//since its, kind of in this higher level, garbage collected and reused at once,
		//based on that Tensor is immutable and Mem/WebGLTexture is mutable.
		//During this, mem.tensor should be null, and at end, create new Tensor(mem)
		//for each memsOut. Creating a tensor just wraps the Mem, doesnt copy contents,
		//and is still backed by GPU memory.
		let memsIn = []; //contains nulls where u dont use them
		let memsOut = []; //contains nulls where u dont use them
		//for each index in mems*, memsIn or memsOut or both have it.
		
		let uniformsIn = []; //undefined except at primitive uniforms
		
		let tensorsToDecrementFreeAtEnd = [];
		
		for(let i=0; i<glvars.length; i++){
			let glvar = glvars[i];
			let isIn = glvar.isIn(), isInTex = glvar.isInTex(), isOut = glvar.isOut();
			//console.log('glvars looping, glvars['+i+']='+glvar+' isIn='+isIn+' isInTex='+isInTex+' isOut='+isOut);
			let tensorIn = null;
			if(isIn){
				if(isOut) Err('Cant be both in and out: '+glvar);
				//console.log('START isIn, glvar='+glvar);
				if(isInTex){
					tensorIn = map[glvar.name];
					if(!tensorIn) Err('No tensorIn for '+glvar);
					tensorsToDecrementFreeAtEnd.push(tensorIn);
					memsIn[i] = tensorIn.mem; //read-only and immutable
					//console.log('END isIn, glvar='+glvar+', memsIn['+i+'] = '+tensorIn+' of name '+glvar.name+' texture='+ tensorIn.mem.mut);
				}else if(hasXYAttr && glvar.name=='XY'){
					//the var of hasXYAttr. Do nothing here, just log it. Set it later by 2 triangles.
					//console.log(`END isIn (vertex attr)	${glvar.name}	– no uniform upload cuz is an in.`);
				}else{ //uniformsIn
					let val = map[glvar.name];
					if(val === undefined){
						Err('No uniform value for '+glvar.name);
					}
					/* -----------------------------------------------------------------
						Promote plain JS lists → typed arrays exactly once, picking the
						right element type from the GLSL declaration.
						float / vec* / mat*	→ Float32Array
						int/ivec*		 → Int32Array
						uint/uvec*		→ Int32Array	 (WebGL has no Uint32Uniform)
						-----------------------------------------------------------------
					*/
					if(Array.isArray(val)){
						const t = glvar.glType;	 // e.g. "float", "vec3", "int", …
						if(t === 'float' || t.startsWith('vec') || t.startsWith('mat')){
							val = new Float32Array(val);
						}else if(t === 'int'	|| t.startsWith('ivec') ||
								t === 'uint' || t.startsWith('uvec')){
							val = new Int32Array(val);
						}else{
							Err('Don’t know how to promote list for '+t+' '+glvar.name);
						}
					}
					uniformsIn[i] = val; //remember for later
					//console.log('END isIn, primitive uniform glvar.name='+glvar.name+' jsType_val='+Lamgl.jsType(val)+' val='+val);
				}
			}else if(isOut){ //isOut
				//console.log('START isOut, glvar='+glvar);
				
				
				//Cant do it as "const canReuseTexture = firstStateTensor.fr === 1;" cuz requires checking if
				//firstStateTensor exists cuz its an optional param. for each output, it optionally is also a param
				//for the starting state of the output memory, which gl_Position can sparsely write on top of.
				let firstStateTensor = map[glvar.name]; //if this doesnt exist, start with an empty state.
				//the optimization this whole LamGL software is based on,
				//that allows it to be completely stateless/immutable Tensors
				//that share and reuse GPU memory without copying back to CPU
				//except as needed after 1 or many GPU calls.
				let doSharedTextureOptimization = false;
				//console.log('doSharedTextureOptimization='+doSharedTextureOptimization);
				if(firstStateTensor){
					//console.log('isOut: map.'+glvar.name+' exists so using it as the starting state (firstStateTensor) of that texture/GPUMemory. If its .fr/free is 1, will do the optimization to reuse that texture, else will copy it first.');
					doSharedTextureOptimization = firstStateTensor.fr==1;
					//TODO firstStateTensor.useFree() at end. cant free it yet.
				}
				
				/*if(firstStateTensor && doSharedTextureOptimization){ //use 1 texture as if it was 2
					firstStateTensor.tensor = null;
					memsOut[i] = firstStateTensor.mem;
				}else if(firstStateTensor){ //use 2 textures, copy-on-write
					tensorsToDecrementFreeAtEnd.push(firstStateTensor);
					memsOut[i] = firstStateTensor.copy().mem;
				}else{ //no firstStateTensor, start with empty memory
					memsOut[i] = vm.gpuMalloc(map.sh); // assumes `map.sh` is the desired shape
				}*/
				
				if(firstStateTensor){
					if(doSharedTextureOptimization){
						//garbage collect immutable tensor so can reuse texture/mem
						firstStateTensor.tensor = null;
						memsOut[i] = firstStateTensor.mem;
						//console.log('yes firstStateTensor, doSharedTextureOptimization=TRUE, memsOut['+i+'] = '+firstStateTensor+' of name '+glvar.name);
					}else{
						//firstStateTensor.fr is big enuf its not garbage collected,
						//so this (after copy) is the last we use it in this call of callGPU.
						//Instead, we copy it to another texture/mem and use that as output,
						//including that its a mutable texture during writing it,
						//as it has its previous contents and wherever gl_Position
						//sparsely writes voxels over it.
						//Each vertex/GPUThread can choose 1 address (ivec2 or ivec3
						//depending on if its a 2d or 3d texture),
						//and write 1-8 vec4s there, 1 vec4 written to each output texture,
						//and gl has a limit of at most 8 output textures (normally just 1).
						//firstStateTensor.useFree(); //decrement firstStateTensor.fr
						tensorsToDecrementFreeAtEnd.push(firstStateTensor);
						//new GPU mem. starts with high .fr
						memsOut[i] = firstStateTensor.copy().mem;
						//console.log('yes firstStateTensor, doSharedTextureOptimization=FALSE, memsOut['+i+'] = COPY '+firstStateTensor+' of name '+glvar.name);
					}
				}else{
					memsOut[i] = vm.gpuMallocMem(sh);
					//console.log('no firstStateTensor, memsOut['+i+'] = COPY '+firstStateTensor+' of name '+glvar.name);
					if(memsOut[i].tensor) Err('gpuMallocMem gave Mem with a tensor');
				}
				
				/*
				Todo('there might be 3 cases, do optimization, dont do optimization, where there is .fr>1 so still gotta copy, and where there is .fr==1 so reuse it (the optimization). some combo of those');
				if(doSharedTextureOptimization){ //use 1 texture as if it was 2
					Todo('this might be wrong, check [there might be 3 cases]');
					//garbage collect immutable tensor so can reuse texture/mem
					firstStateTensor.tensor = null;
					memsOut[i] = firstStateTensor.mem;
				}else{ //use 2 textures, copy-on-write
					Todo('this might be wrong, check [there might be 3 cases]');
					//firstStateTensor.fr is big enuf its not garbage collected,
					//so this (after copy) is the last we use it in this call of callGPU.
					//Instead, we copy it to another texture/mem and use that as output,
					//including that its a mutable texture during writing it,
					//as it has its previous contents and wherever gl_Position
					//sparsely writes voxels over it.
					//Each vertex/GPUThread can choose 1 address (ivec2 or ivec3
					//depending on if its a 2d or 3d texture),
					//and write 1-8 vec4s there, 1 vec4 written to each output texture,
					//and gl has a limit of at most 8 output textures (normally just 1).
					//firstStateTensor.useFree(); //decrement firstStateTensor.fr
					tensorsToDecrementFreeAtEnd.push(firstStateTensor);
					//new GPU mem. starts with high .fr
					memsOut[i] = firstStateTensor.copy().mem;
				}
				*/
				
				//console.log('END isOut, glvar='+glvar+', memsOut['+i+'] = Tensor '+glvar.name+', GPU texture ='+memsOut[i].mut);
			}else Err('Is not in or out: '+glvar+' FIXME what if its an input of fragment shader (sf) which comes after vertex shader (sv).');
		}
		//console.log('Got '+memsIn.filter(x=>!!x).length+' ins and '+memsOut.filter(x=>!!x).length+' outs, excluding nulls/undefineds in memsIn and memsOut lists.');
		//Todo();
		
		//todo remove this double loop. also, does doSharedTextureOptimization allow them to be both in and out in some cases?
		//console.log('--- Checking input/output GPU memory overlap ---');
		for (let i = 0; i < memsIn.length; i++) {
			const memIn = memsIn[i];
			if (!memIn) continue;
			for (let j = 0; j < memsOut.length; j++) {
				const memOut = memsOut[j];
				if (!memOut) continue;
				if (memIn.mut === memOut.mut) {
					console.warn(`ERR, ⚠️ memsIn[${i}] and memsOut[${j}] share the SAME WebGLTexture!`, memIn.mut);
				}else{
					//console.warn(`OK memsIn[${i}] and memsOut[${j}]`);
				}
			}
		}
		//console.log('--- End check ---');

		
		let program = vm.cache('program'+cacheKeySuffix, function(){
			let vertexShader = vm.cache('vertexShader'+cacheKeySuffix, function(){
				sv = vm.preprocessShaderString(sv); //add line numbers etc
				let v = gl.createShader(gl.VERTEX_SHADER);
				gl.shaderSource(v, sv);
				gl.compileShader(v);
				if(!gl.getShaderParameter(v, gl.COMPILE_STATUS)){
					throw new Error(gl.getShaderInfoLog(v)+'\n\nVERTEXSHADERCODE:\n'+sv);
				}
				return v;
			});
			console.log('vertexShader='+vertexShader);
			let fragmentShader = vm.cache('fragmentShader'+cacheKeySuffix, function(){
				sf = vm.preprocessShaderString(sf); //add line numbers etc
				const f = gl.createShader(gl.FRAGMENT_SHADER);
				gl.shaderSource(f, sf);
				gl.compileShader(f);
				if(!gl.getShaderParameter(f, gl.COMPILE_STATUS)){
					throw new Error(gl.getShaderInfoLog(f)+'\n\nFRAGMENTSHADERCODE:\n'+sf);
				}
				return f;
			});
			console.log('fragmentShader='+fragmentShader);
			const p = gl.createProgram();
			gl.attachShader(p, vertexShader);
			gl.attachShader(p, fragmentShader);
			gl.linkProgram(p);
			console.log('skip_gl_getProgramParameter_LINK_STATUS='+vm.skip_gl_getProgramParameter_LINK_STATUS);
			if(!vm.skip_gl_getProgramParameter_LINK_STATUS && !gl.getProgramParameter(p, gl.LINK_STATUS)){
				Err(gl.getProgramInfoLog(p));
			}
			return p;
		});
		//console.log('program='+program);
		
	
		
		let ret = {};
		
		//nTextures are outputs, not inputs. 1-8 textures of float or vec4 per pixel each.
		
		/*if(nTextures.length > 1){
			//Specify the draw buffers for multiple render targets
			const attachments = nTextures.map((_, index) => gl.COLOR_ATTACHMENT0 + index);
			gl.drawBuffers(attachments);
		}*/
		let texturesOut = [];
		if(sc){
			//console.log('Skipping for(let mem of memsOut) if(mem) texturesOut.push(mem.mut); cuz sc aka output to the canvas that created this GL aka null frameBuffer');
		}else{
			for(let mem of memsOut) if(mem) texturesOut.push(mem.mut);
		}
		
		//vm.cacheFramebuffer = true;
		vm.cacheFramebuffer = false;
		//console.log('vm.cacheFramebuffer='+vm.cacheFramebuffer);
		
		let frameBuffer = null;
		if(!sc){
			let frameBufferMaker = function(){
				const f = gl.createFramebuffer();
				gl.bindFramebuffer(gl.FRAMEBUFFER, f);
				for(let i=0; i<texturesOut.length; i++){
					gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0+i, gl.TEXTURE_2D, texturesOut[i], 0);
				}
				return f;
			};
			frameBuffer = vm.cacheFramebuffer ?
				vm.cache('frameBuffer'+cacheKeySuffix, frameBufferMaker)
				: frameBufferMaker();
		}
		
				
		gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer); //frameBuffer is null if sc
		//gl.clearColor(0, 0, 0, 0);
		//gl.clear(gl.COLOR_BUFFER_BIT);
		//FIXME sh.length-4 is zSize in 3d texture. should i reverse this?
		let height = sh[sh.length-3], width = sh[sh.length-2], floatsPerPixel = sh[sh.length-1];
		gl.viewport(0, 0, width, height);
		gl.useProgram(program);
		
		if(texturesOut.length){
			const attachments = texturesOut.map((_,i)=>(gl.COLOR_ATTACHMENT0+i));
			//console.log('Calling gl.drawBuffers');
			gl.drawBuffers(attachments); 
			//gl.drawBuffers(texturesOut);
		}
		
		
		// === Bind sampler2D uniforms ===
		let nextTextureUnit = 0;
		for (let i = 0; i < glvars.length; i++) {
			const glvar = glvars[i];
			if (!glvar.isInTex()) continue;	// only bind texture inputs

			const mem = memsIn[i];
			if (!mem) continue;

			gl.activeTexture(gl.TEXTURE0 + nextTextureUnit);
			gl.bindTexture(gl.TEXTURE_2D, mem.mut);

			const loc = gl.getUniformLocation(program, glvar.name);
			if (loc !== null) {
				gl.uniform1i(loc, nextTextureUnit);
			}
			nextTextureUnit++;
		}


		// --- bind primitive uniforms ---------------------------------------
		for(let i=0; i<glvars.length; i++){ //added 2025-6-21
			let val = uniformsIn[i];
			if (val === undefined) continue;			 // not a uniform
			//console.log('uniformsIn doing gl.uniform* to set value, glvars['+i+']='+glvars[i]+', val='+val);
			//let loc = gl.getUniformLocation(program, glvars[i].name);
			// first try plain name, then the "[0]" form required for arrays
			let loc = gl.getUniformLocation(program, glvars[i].name) //normal
				|| gl.getUniformLocation(program, glvars[i].name+'[0]'); //GPT thought this [0] should be here. probably dont need it
			if(loc === null) continue; //may have been removed by removeGlvarsThatJustCopyFromSvToSf, or could just be missing?
			//Accept number, Array, or Float32Array
			if (typeof val === 'number'){
				gl.uniform1f(loc, val);
			}else if(val instanceof Float32Array || Array.isArray(val)){
				const buf = (val instanceof Float32Array) ? val : new Float32Array(val);
				switch (glvars[i].glType){
					case 'float': gl.uniform1fv(loc, buf); break;
					case 'vec2':	gl.uniform2fv(loc, buf); break;
					case 'vec3':	gl.uniform3fv(loc, buf); break;
					case 'vec4':	gl.uniform4fv(loc, buf); break;
					default:
						Err('Unsupported uniform type '+glvars[i].glType+' for '+glvars[i].name);
				}
				/*switch (val.length){
					case 1:
						gl.uniform1f(loc, val[0]);
					break;case 2:
						gl.uniform2fv(loc, val);
					break;case 3:
						gl.uniform3fv(loc, val);
					break;case 4:
						gl.uniform4fv(loc, val);
					break;default:
						Err('Unsupported uniform length for '+glvars[i].name+'. TODO arrays, but u will have a limit of about 4k total uniforms in vertex shader and 1k in fragment shader.');
				}*/
			}else{
				Err('Unsupported uniform type for '+glvars[i].name);
			}
		}

		
		
		if(hasXYAttr){ //2 triangles filling rectangle, use "in vec2 XY;"
			//console.log('Lamgl doing 2 triangles: in vec2 XY;');
			//lazy-create and cache a full-screen quad VBO (6 vertices)
			const quadBuf = vm.cache('lamgl_quadVBO', () => {
				const q = gl.createBuffer();
				gl.bindBuffer(gl.ARRAY_BUFFER, q);
				gl.bufferData(
					gl.ARRAY_BUFFER,
					new Float32Array([
						-1,-1,	 1,-1,	-1, 1,
						-1, 1,	 1,-1,	 1, 1,
					]),
					gl.STATIC_DRAW
				);
				return q;
			});
			//hook the XY attribute of *this* program to that VBO
			const locXY = gl.getAttribLocation(program, 'XY');
			if (locXY !== -1) {
				gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
				gl.enableVertexAttribArray(locXY);
				gl.vertexAttribPointer(locXY, 2, gl.FLOAT, false, 0, 0);
			}
			//rasterise the quad
			gl.drawArrays(gl.TRIANGLES, 0, 6);
			//leave no attribs enabled for later POINTS calls
			if (locXY !== -1) gl.disableVertexAttribArray(locXY);
		}else{ //gl_VertexID
			//console.log('Lamgl doing points as gl_VertexID.');
			//=== run shader for every pixel/voxel using gl_VertexID ===
			let numVerts = 1;
			for(let d = 0; d < sh.length - 1; d++){	 // multiply all dims except the last (==4)
				numVerts *= sh[d];
			}
			gl.drawArrays(gl.POINTS, 0, numVerts);	// no VBO needed – gl_VertexID drives the math
		}

		//=== wrap each output Mem in an immutable Tensor and expose it ===
		for(let i=0; i<glvars.length; i++){
			if(glvars[i].isOut() && memsOut[i]){
				let t = memsOut[i].tensor || new vm.Tensor(memsOut[i]);
				memsOut[i].tensor = t;			// back-link for texture pooling
				ret[glvars[i].name] = t;			// e.g. ret.result
			}
		}
		
		//unbind input textures that were binded in the loop
		//containing "if (!glvar.isInTex()) continue;	// only bind texture inputs"
		for (let i = 0; i < nextTextureUnit; i++){
			gl.activeTexture(gl.TEXTURE0 + i);
			gl.bindTexture(gl.TEXTURE_2D, null); //this was here 2025-6-21 for long time
			//gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i, gl.TEXTURE_2D, null, 0); //new 2025-6-21
		}
		if(frameBuffer){ //new 2025-6-21
			for(let i=0; i<texturesOut.length; i++){
				gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0+i, gl.TEXTURE_2D, null, 0); //detach
			}
		}
		// === Unbind frameBuffer output ===
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		// === Optional: reset active texture to 0 for consistency ===
		gl.activeTexture(gl.TEXTURE0);
		gl.useProgram(null);
		gl.bindVertexArray(null); //even tho its not using a vertex array
		
		for(let tensor of tensorsToDecrementFreeAtEnd){
			//decrement tensor.fr and if its 0 return its texture/mem to pool
			tensor.useFree();
		}
		
		return ret;
	};
	
	vm.preprocessShaderString = code=>{
		return vm.addLineNumbers(code);
	};
	
	//This is for lines like "out vec4 result; //comment".
	//TODO? eltype is element type, like 'vec4' or 'float' or 'int',
	//regardless of its an array/texture vs one primitive.
	//sh is [] if not an array, or [arraySize] or [outerSize, innerSize], etc.
	vm.GLVar = function(memType, glType, sh, name, charPtrFrom, charPtrTo, shaderType){
		this.memType = memType;
		this.glType = glType;
		this.sh = sh;
		this.name = name;
		this.charPtrFrom = charPtrFrom; //inclusive, range of the shader code string
		this.charPtrTo = charPtrTo; //exclusive
		this.shaderType = shaderType;
	};
	
	vm.GLVar.prototype.isIn = function(){
		// Treat uniforms and varying inputs (from vertex shader) as inputs
		return this.memType === 'uniform' || this.memType === 'in';
	};

	vm.GLVar.prototype.isInTex = function(){
		// A sampler2D, samplerCube, etc., in a uniform is a texture input
		return this.memType === 'uniform' && this.glType.startsWith('sampler');
	};

	vm.GLVar.prototype.isOutTex = function(){
		// Fragment outputs (out vec4 ...) are the only texture outputs
		return this.memType === 'out';
	};

	vm.GLVar.prototype.isOut = function(){
		// Alias to isOutTex for now, but leaves room to generalize later
		return this.isOutTex();
	};

	
	vm.GLVar.prototype.toString = function(){
		return '[GLVar memType='+this.memType+' glType='+this.glType+' sh='+vm.Str(this.sh)+' name='+this.name+' charPtrFrom='+this.charPtrFrom+' charPtrTo='+this.charPtrTo+' shaderType='+this.shaderType+']';
	};
	
	//Returns a list of glvars excluding those that are out from sv and in to sf of the same name and type,
	//which are only used to copy between the 2 shaders and are not inputs/outputs of the Lamgl call.
	vm.removeGlvarsThatJustCopyFromSvToSf = function(glvars) {
		const buckets = {};
		const toRemove = new Set();

		for (let i = 0; i < glvars.length; i++) {
			const v = glvars[i];
			const key = v.name + '|' + v.glType;
			let bucket = buckets[key] || (buckets[key] = []);
			//bucket.push({ idx: i, v: v });
			bucket.push(v);
		}

		for (let key in buckets) {
			const list = buckets[key];
			if (list.length === 2) {
				const [a, b] = list;
				if (
					(a.memType === 'out' && a.shaderType === 'sv' &&
					 b.memType === 'in'	&& b.shaderType === 'sf') ||
					(b.memType === 'out' && b.shaderType === 'sv' &&
					 a.memType === 'in'	&& a.shaderType === 'sf')
				) {
					//toRemove.add(a.idx);
					//toRemove.add(b.idx);
					toRemove.add(a);
					toRemove.add(b);
				}
			}
		}

		//console.log('removeGlvarsThatJustCopyFromSvToSf removing '+toRemove.size+' glvars:\n'+[...toRemove].join('\n'));
		return glvars.filter(v=>!toRemove.has(v));
	};

	
	//returns [] list of GLVar's in the order they should be used in gl.
	//map.sv is string of vertex shader code, sf fragement shader,
	//(todo if one of those is not given use or generate some default?).
	/*vm.glvars = map=>{
		Todo();
	};*/
	vm.glvars = map=>{
		const glvars = [];

		/*const parseShaderVars = (shaderSrc, shaderType)=>{
			let charPtr = 0; //running offset
			//fixme what about "flat" keyword and other keywords?
			const lines = shaderSrc.split('\n');
			//for (let line of lines){
			for(let raw of lines){
				const line = raw.trim();
				//line = line.trim();

				// Ignore comments
				if (line.startsWith('//')) continue;

				let isIn = false;
				let memType = null, glType = null, name = null;

				// Handle uniform
				//let matchUniform = line.match(/^uniform\s+(\w+)\s+(\w+);/);
				// Handle uniform	─ (accept optional "[	N ]")
				//let matchUniform = line.match(/^uniform\s+(\w+)\s+([A-Za-z_]\w*)\s*(?:\[\s*\d*\s*\])?\s*;/);
				//Handle uniform ─ (capture optional "[ N ]")
				let matchUniform = line.match(/^uniform\s+(\w+)\s+([A-Za-z_]\w*)\s*(?:\[\s*(\d*)\s*\])?\s*;/);
				if(matchUniform){
					const from = charPtr + raw.indexOf(matchUniform[0]);
					const to   = from + matchUniform[0].length;
					glType = matchUniform[1];
					name = matchUniform[2];
					/*GPT-o3 said, about "what do you expect to be in matchUniform[3] ?": matchUniform[3] is the optional numeric size that appears inside the square-brackets of an array uniform declaration:
					uniform float foo[ 128 ];   // ← “128” is captured as matchUniform[3]
					uniform vec3  bar[4];       // ← “4”
					uniform float baz;          // ← no “[ … ]”, so matchUniform[3] is undefined
					*
					let asz = matchUniform[3] ? parseInt(matchUniform[3]) : null;
					let sh = asz ? [asz] : [];
					memType = 'uniform';
					isIn = true;
					//glvars.push(new vm.GLVar(memType, glType, name, shaderType));
					//glvars.push(new vm.GLVar(memType, glType, sh, name, shaderType));
					glvars.push(new vm.GLVar(memType, glType, sh, name, from, to, shaderType));
					continue;
				}

				// Handle in/out (varyings, fragment outputs, etc.)
				//let matchIO = line.match(/^(in|out)\s+(\w+)\s+(\w+);/);
				// Handle in/out (varyings, fragment outputs, etc.)
				//let matchIO = line.match(/^(in|out)\s+(\w+)\s+([A-Za-z_]\w*)\s*(?:\[\s*\d*\])?\s*;/);
				let matchIO = line.match(/^(in|out)\s+(\w+)\s+([A-Za-z_]\w*)\s*(?:\[\s*(\d*)\s*\])?\s*;/);
				if(matchIO){
					const from = charPtr + raw.indexOf(matchIO[0]);
					const to   = from + matchIO[0].length;
					let qualifier = matchIO[1];
					glType = matchIO[2];
					name = matchIO[3];
					let asz = matchIO[4] ? parseInt(matchIO[4]) : null;
					memType = qualifier;
					let sh  = asz ? [asz] : [];
					isIn = (qualifier === 'in');
					//glvars.push(new vm.GLVar(memType, glType, name, shaderType));
					//glvars.push(new vm.GLVar(memType, glType, sh, name, shaderType));
					glvars.push(new vm.GLVar(memType, glType, sh, name, from, to, shaderType));
					continue;
				}

				// Handle layout(...) out vec4 NAME;
				//let matchLayoutOut = line.match(/^layout\s*\(.*?\)\s*out\s+(\w+)\s+(\w+);/);
				// Handle layout(...) out vec4 NAME;
				//let matchLayoutOut = line.match(/^layout\s*\(.*?\)\s*out\s+(\w+)\s+([A-Za-z_]\w*)\s*(?:\[\s*\d*\])?\s*;/);
				let matchLayoutOut = line.match(/^layout\s*\(.*?\)\s*out\s+(\w+)\s+([A-Za-z_]\w*)\s*(?:\[\s*(\d*)\s*\])?\s*;/);
				if(matchLayoutOut){
					const from = charPtr + raw.indexOf(matchLayoutOut[0]);
					const to   = from + matchLayoutOut[0].length;
					glType = matchLayoutOut[1];
					name = matchLayoutOut[2];
					let asz = matchLayoutOut[3] ? parseInt(matchLayoutOut[3]) : null;
					let sh  = asz ? [asz] : [];
					memType = 'out';
					isIn = false;
					//glvars.push(new vm.GLVar(memType, glType, name, shaderType));
					//glvars.push(new vm.GLVar(memType, glType, sh, name, shaderType));
					glvars.push(new vm.GLVar(memType, glType, sh, name, from, to, shaderType));
					continue;
				}
				charPtr += raw.length+1; // +1 for '\n'. FIXME norm newlines
			}
		};*/
		
		const parseShaderVars = (shaderSrc, shaderType)=>{
			let charPtr = 0;                          // running offset into shaderSrc
			const lines  = shaderSrc.split('\n');

			for(const raw of lines){
				const lineStart = charPtr;            // ← position of this line in the full source
				const line      = raw.trim();

				// ----- skip comments ------------------------------------------------
				if(line.startsWith('//')){
					charPtr += raw.length + 1;        // still count the line + '\n'
					continue;
				}

				// ---------- uniform -------------------------------------------------
				let m = line.match(/^uniform\s+(\w+)\s+([A-Za-z_]\w*)\s*(?:\[\s*(\d*)\s*\])?\s*;/);
				if (m) {
					const from = lineStart + raw.indexOf(m[0]);
					const to   = from      + m[0].length;

					const asz = m[3] ? parseInt(m[3], 10) : null;
					glvars.push(new vm.GLVar(
						'uniform', m[1], asz ? [asz] : [], m[2],
						from, to, shaderType
					));
					charPtr += raw.length + 1;        // ✅ advance before next loop
					continue;
				}

				// ---------- in / out -----------------------------------------------
				m = line.match(/^(in|out)\s+(\w+)\s+([A-Za-z_]\w*)\s*(?:\[\s*(\d*)\s*\])?\s*;/);
				if (m) {
					const from = lineStart + raw.indexOf(m[0]);
					const to   = from      + m[0].length;

					const asz = m[4] ? parseInt(m[4], 10) : null;
					glvars.push(new vm.GLVar(
						m[1], m[2], asz ? [asz] : [], m[3],
						from, to, shaderType
					));
					charPtr += raw.length + 1;
					continue;
				}

				// ---------- layout(...) out ----------------------------------------
				m = line.match(/^layout\s*\(.*?\)\s*out\s+(\w+)\s+([A-Za-z_]\w*)\s*(?:\[\s*(\d*)\s*\])?\s*;/);
				if (m) {
					const from = lineStart + raw.indexOf(m[0]);
					const to   = from      + m[0].length;

					const asz = m[3] ? parseInt(m[3], 10) : null;
					glvars.push(new vm.GLVar(
						'out', m[1], asz ? [asz] : [], m[2],
						from, to, shaderType
					));
					charPtr += raw.length + 1;
					continue;
				}

				// ---------- no match on this line -----------------------------------
				charPtr += raw.length + 1;
			}
		};

		if (map.sv) parseShaderVars(map.sv, 'sv');
		if (map.sf) parseShaderVars(map.sf, 'sf');

		return vm.removeGlvarsThatJustCopyFromSvToSf(glvars);
	};

	
	//vm.Str = 
	
	//TODO make a way to call Lamgl({...}) that takes a string of js code that generates
	//the Float32Array or Mem/texture contents in CPU.
	//Maybe name it sj (j for javascript) like sv (vertex shader) and sf (fragment shader).
	//A tensor could be more general, in cpu mem or gpu mem.
	
	vm.wrap = (wrapMe,optionalSh)=>{
		if(wrapMe instanceof Float32Array){
			let sh = optionalSh || [wrapMe.length>>2, 4]; //FIXME what if its not a multiple of 4?
			let mem = vm.gpuMallocMem(sh);
			mem.set(wrapMe); //copy from CPU (Float32Array wrapMe) to GPU (WebGLTexture in mem.mut)
			return new vm.Tensor(mem);
		}else Err('wrapMe is a '+typeof(wrapMe));
	};
	
		//immutable, normally exists in a Mem. Is same shape as that mem.
	vm.Tensor = function(mem,optionalFr){
		this.mem = mem;
		this.sh = mem.sh;
		//countdown until garbcol. Each time its read in GPU,
		//this is decremented. When it reaches 0, vm.gpuFree(this)
		//is called to return that GPU memory to the pool.
		this.fr = optionalFr || vm.defaultFr;
		if(mem.tensor){
			Err('mem already has a tensor and its not this one, mem='+mem+', thisTensor='+this);
		}else{
			mem.tensor = this;
		}
	};
	
	vm.Tensor.prototype.toString = function(){
		return '[Tensor sh='+JSON.stringify(this.sh)+']';
	};
	
	//Fast. this.get().length but without calling this.get() cuz that would copy from GPU to CPU.
	vm.Tensor.prototype.size = function(){
		return this.mem.size();
	};
	
	//return a Float32Array copy of the WebGLTexture in the mem backing this Tensor
	vm.Tensor.prototype.get = function(){
		return this.mem.get();
	};
	
	//Returns this Tensor with fr set.
	//Like, vm.gpuMalloc([300,500,4]).free(1) is a Tensor that will free
	//its WebGLTexture (back to the vm.texPool) after the next GPU call.
	//if optionalFr is not given or is 0, frees now.
	//If its 1, frees on the next use (1 more GPU call),
	//fr decreases by 1 each GPU call.
	vm.Tensor.prototype.free = function(optionalFr){
		this.fr = optionalFr|0;
		if(!this.fr){
			vm.gpuFreeMem(this.mem); //free the WebGLTexture but not the js object
		}
		return this;
	};
	
	//use 1 more fr in the countdown, toward garbage collecting the WebGLTexture at this.fr==0,
	//but only back into the vm.texPool pool, not deleting it out of the GPU
	//(todo also that if its not used for a while and the GPU memory is needed).
	vm.Tensor.prototype.useFree = function(){
		if(this.fr){
			this.fr--;
			if(!this.fr){
				vm.gpuFreeMem(this.mem); //free the WebGLTexture but not the js object
			}
		}
	};
	
	//For if sh.length==2, not sure if we even have 1d textures in this version of webgl. Get flattened index.
	vm.Tensor.prototype.ii = function(x, w){
		return x*this.sh[0]+w;
	};

	//For if sh.length==3 like a 2d texture of vec4 per pixel. Get flattened index.
	vm.Tensor.prototype.iii = function(y, x, w){
		return (y*this.sh[0]+x)*this.sh[1]+w;
	};

	//For if sh.length==4 like a 3d texture of vec4 per pixel. Get flattened index.
	vm.Tensor.prototype.iiii = function(z, y, x, w){
		return z*this.sh[0]+(y*this.sh[1]+x)*this.sh[2]+w
	};
	
	//vm.texPool[vm.shKey(sh)] is a [] of unused vm.Mem instances of that sh/shape.
	//See vm.gpuMallocMem and vm.gpuFreeMem.
	vm.texPool = {};
	
	vm.verifyShEndsWithVec4 = sh=>{
		if(sh[sh.length-1] != 4) Err('Last dimension is not 4: '+Str(sh));
	};
	
	//returns a Tensor wrapping a Mem wrapping a WebGLTexture,
	//instead of that Mem. Tensor is immutable. Mem is mutable.
	//The Tensor contains whatever data was in WebGLTexture (malloc, not calloc).
	//The normal use of this, since Tensor is immutable, would be to remove the Tensor from the Mem,
	//modify the Mem, then add another Tensor to represent that new Mem state.
	vm.gpuMallocTensor = sh=>(new vm.Tensor(vm.gpuMallocMem(sh)));
	
	vm.gpuMallocMem_usesCache = true; //normal
	//vm.gpuMallocMem_usesCache = false; //test
	//console.log('vm.gpuMallocMem_usesCache='+vm.gpuMallocMem_usesCache);
	
	//Example: vm.gpuMallocMem([300,500,4]) returns a Mem.
	//allocate a texture of a chosen sh/shape from pool, in GPU mem.
	//Returns a Mem instance wrapping a WebGLTexture of 2d or 3d,
	//normally with 4 floats per pixel (vec4) as sh[sh.length-1] is normaly 4.
	//This is specificly a malloc, not calloc, as it doesnt clear the mem.
	//Only the first use of a WebGLTexture is cleared,
	//but after that it can be returned to the pool and reallocated without clearing,
	//but it should be written before read again.
	vm.gpuMallocMem = sh=>{
		vm.verifyShEndsWithVec4(sh);
		let k = vm.shKey(sh);
		//list of Mem's whose mem.sh contents equal.
		let list = vm.texPool[k] || (vm.texPool[k] = []);
		if(vm.gpuMallocMem_usesCache && list.length){
			//console.log('gpuMallocMem returning from cache, sh='+vm.Str(sh));
			return list.pop();
		}else{
			let tex = null;
			if(sh.length==3 && sh[2]==4){
				//2d WebGLTexture with vec4 per pixel
				//console.log('gpuMallocMem makeGLTexture2dVec4, sh='+vm.Str(sh));
				tex = vm.makeGLTexture2dVec4(sh[0], sh[1]);
			}else if(sh.length==3 && sh[2]==4){
				Todo('new 3d WebGLTexture (vec4 per pixel) of that sh='+Str(sh));
			}else{
				Todo('new WebGLTexture of that sh='+Str(sh));
			}
			return new vm.Mem(tex, sh);
			//return new vm.Tensor(new vm.Mem(tex, sh));
		}
	};
	
	//Example:	mem is what a vm.gpuMalloc returned.
	//FIXME: Does not check if its already freed or if its already in texPool,
	//so only call once after each gpuMallocMem.
	vm.gpuFreeMem = mem=>{
		//console.log('gpuFreeMem this='+this);
		mem.tensor.mem = null; //breaks the tensor, cant use it anymore
		mem.tensor = null;
		let k = vm.shKey(mem.sh);
		let list = vm.texPool[k] || (vm.texPool[k] = []);
		list.push(mem);
	};
	
	vm.shKey = sh=>sh.join('_');
	
	//mutable. wraps WebGLTexture and maybe Float32Array.
	//shape is [z,y,x,4] or [y,x,4] or [y,x,1] or [500] etc. As of 2025-5-6 only [height,width,4] is supported.
	vm.Mem = function(mutableMem, shape){
		this.mut = mutableMem;
		this.sh = shape;
		this.tensor = null; //this Mem is in the pool when this.tensor is null.
	};
	
	vm.mulAll = function(vec){
		let ret = 1;
		for(let num of vec) ret *= num;
		return ret;
	};
	
	vm.Mem.prototype.size = function(){
		return vm.mulAll(this.sh);
	};
	
	//copy gpu to cpu
	vm.Mem.prototype.get = function(optionalFloat32Array){
		let size = this.size();
		let ret = optionalFloat32Array || new Float32Array(size);
		vm.copyTextureToFloat32Array(this.mut,this.sh,ret); //GPU
		return ret;
	};
	
	/*vm.copyTextureToFloat32Array = (tex,floatsOut)=>{
		Todo();
	};*/
	vm.copyTextureToFloat32Array = (tex, sh, floatsOut) => {
		if(sh.length != 3) Todo('sh.length=='+sh.length);
		const gl = vm.Gl();
		let isTex = gl.isTexture(tex);
		if(!isTex){
			Err('NOT gl.isTexture(tex) at the start of copyTextureToFloat32Array, see bug in bellsack190_mostBallsMoveDiffDirectionsButAfter10SecondsGLCrashesSeeDetailsInFIXMETextInUI.html vs that bug does not happen in bellsack183.html, if you wait about [30 seconds or 2000 video frames].');
		}
		//console.log('copyTextureToFloat32Array, lamglLoopBody_count='+(lamglLoopBody_count)+', gl.isTexture(tex)='+isTex+', sh='+Lamgl.Str(sh)+' floatsOut.length='+floatsOut.length+' typeof(tex)='+typeof(tex));

		// Assume the texture is 2D and in RGBA32F format
		// Find the dimensions from floatsOut.length and assume vec4 per pixel
		let totalFloats = floatsOut.length;
		let height = sh[0];
		let width = sh[1];
		let pixels = totalFloats/sh[2];
		
		//FIXME sh.length-4 is zSize in 3d texture. should i reverse this?
		//let height = sh[sh.length-3], width = sh[sh.length-2], floatsPerPixel = sh[sh.length-1];
		
		/*let pixels = totalFloats / 4;
		let width = Math.ceil(Math.sqrt(pixels));
		let height = Math.ceil(pixels / width); //TODO choose width and height better
		*/

		// Create a temporary frameBuffer and attach the texture to it
		const frameBuffer = gl.createFramebuffer();
		console.log('copyTextureToFloat32Array, after gl.createFramebuffer gl.isTexture(tex)='+gl.isTexture(tex));
		gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);
		console.log('copyTextureToFloat32Array, after gl.bindFramebuffer gl.isTexture(tex)='+gl.isTexture(tex));
		gl.viewport(0, 0, width, height);
		console.log('copyTextureToFloat32Array, after gl.viewport(0, 0, '+width+', '+height+') gl.isTexture(tex)='+gl.isTexture(tex));
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
		console.log('copyTextureToFloat32Array, after gl.framebufferTexture2D gl.isTexture(tex)='+gl.isTexture(tex));

		let status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
		if (status !== gl.FRAMEBUFFER_COMPLETE) {
			// Clean up before erroring out
			gl.bindFramebuffer(gl.FRAMEBUFFER, null);
			gl.deleteFramebuffer(frameBuffer);
			Err('Framebuffer not complete: ' + status);
		}

		// Read pixels from the frameBuffer into the Float32Array
		gl.readPixels(
			0, 0, width, height,
			gl.RGBA, gl.FLOAT,
			floatsOut
		);

		// Clean up
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		gl.deleteFramebuffer(frameBuffer);
	};
	
	//vm.skip_gl_getProgramParameter_LINK_STATUS = false; //2024-5-9-640pET defaulting this to false (dont skip) cuz of I turned SKLT=F (dont skip) by clicking the button and this neuralnet nnet_1715286589.548.dagball compiled in about .1 second when I changed {nodes 12} to {nodes 13}.
	//skip_gl_getProgramParameter_LINK_STATUS: true, //normal as of 2024-5-9 cuz it made compiling GLSL alot faster, probably some thread thing it didnt have to wait on, considering theres multiple off-screen canvases.
	//skip_gl_getProgramParameter_LINK_STATUS: false, //normal before 2024-5-9, but TODO experimentally trying skipping it cuz this line takes .1 to 20 seconds and is likely causing threads to wait on eachother
	//skip_gl_getProgramParameter_LINK_STATUS: true, //for testing, or maybe it will work out this way?
	vm.skip_gl_getProgramParameter_LINK_STATUS = true, //2025-7-19 changed this to true (was undefined) cuz page loading slow
	
	//copy cpu to gpu
	vm.Mem.prototype.set = function(float32Array){
		vm.copyFloat32ArrayToTexture(float32Array,this.mut,this.sh);
	};
	
	// --- CPU → GPU upload ----------------------------------------------
	vm.copyFloat32ArrayToTexture = (src, tex, sh) => {
		// sh is the tensor shape that texture represents, e.g. [h, w, 4]
		if (!sh || sh.length !== 3 || sh[2] !== 4) {
			Err('copyFloat32ArrayToTexture: shape must be [height,width,4]');
		}
		const gl	 = vm.Gl();
		const height = sh[0];
		const width	= sh[1];

		gl.bindTexture(gl.TEXTURE_2D, tex);
		gl.texSubImage2D(
			gl.TEXTURE_2D,
			0,				 // level
			0, 0,				// x-offset, y-offset
			width, height,	 // size
			gl.RGBA,			 // format
			gl.FLOAT,			// type
			src				// the Float32Array with 4*width*height values
		);
	};

	
	vm.webglType = 'webgl2'; //If you change this from 'webgl2' to 'webgl', some features wont be there and it will break.
	vm.glslVersionString = '#version 300 es'; //WebGL2 GLSL ES 300
	
	//returns 'Uint8Array' or 'Float64Array' or 'object' or 'number' or 'string' for example.
	vm.jsType = x=>(ArrayBuffer.isView(x) ? x.constructor.name : typeof(x)),
	
	vm.gl = null; //the only GL instance, normally WebGL2 GLSL ES 300
	vm.glCanv = null;
	//vm.glCanvasHeight = 1; //1x1 canvas, cuz gonna use gl_VertexID instead of 2 triangles that form a rectangle covering the canvas
	//vm.glCanvasWidth = 1;
	//vm.glCanvasHeight = 300; //experiment avoid resizing canvas to see if it boots faster 2025-7-19
	//vm.glCanvasWidth = 400; //experiment avoid resizing canvas to see if it boots faster 2025-7-19
	vm.glCanvasHeight = 600;
	vm.glCanvasWidth = 800;
	vm.Gl = ()=>{
		if(!vm.gl){
			let c = document.createElement("canvas");
			c.setAttribute("height", ''+vm.glCanvasHeight);
			c.setAttribute("width", ''+vm.glCanvasWidth);
			c.addEventListener('webglcontextlost', function(event){
				//event.preventDefault();
				//activeContexts.delete(context);
				console.log('Lamgl says canvas event webglcontextlost, event='+event);
				/*console.log('TinyGLSL says canvas event webglcontextlost, event='+event);
				if(TinyGlsl.do_clearAllCache_whenWebglContextLost){
					console.log('TinyGlsl.do_clearAllCache_whenWebglContextLost STARTING TinyGlsl.clearAllCache()...');
					TinyGlsl.clearAllCache();
					console.log('TinyGlsl.do_clearAllCache_whenWebglContextLost DONE TinyGlsl.clearAllCache().');
				}*/
			}, false);
			vm.glCanv = c;
			
			let gl = vm.glCanv.getContext(vm.webglType);
			let glErr = gl.getError();
			if(glErr) Err('after canvas.getContext(TinyGlsl.webglType), gl.getError()='+glErr);
			if(!gl.getExtension('EXT_color_buffer_float')){ //this turns the extension on. its not just checking if it exists.
				Err('EXT_color_buffer_float not supported so cant return 1 or 4 floats per pixel instead of bytes');
			}
			let isContextLost = gl.isContextLost();
			console.log('creating gl context, gl.isContextLost()=='+isContextLost);
			if(isContextLost) Err('gl.isContextLost()=='+isContextLost+
				', see https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/isContextLost');
			console.log('Returning new webgl context '+gl);
			vm.gl = gl;
		}
		return vm.gl;
	};
	
	//as comments at end of most lines
	vm.addLineNumbers = code=>{
		let lines = code.split(/(?:\r\n)|\n|\r/); //?: starts a noncapturing group, so it doesnt include those in the returned list, just whats between
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
		return code3;
	};
	
	vm.makeGLTexture2dVec4_count = 0;
	
	vm.makeGLTexture2dVec4 = (height, width, optionalFloat32Array)=>{
		vm.makeGLTexture2dVec4_count++;
		//console.log('makeGLTexture2dVec4, height='+height+' width='+width+' optionalFloat32Array_exists='+!!optionalFloat32Array+' makeGLTexture2dVec4_count='+vm.makeGLTexture2dVec4_count);
		let gl = vm.Gl();
		let t = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, t);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		let floats = optionalFloat32Array || null;
		//gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, width, height, 0, gl.RGBA, gl.FLOAT, floats);
		gl.texImage2D(
			gl.TEXTURE_2D,
			0,
			gl.RGBA32F,
			width,
			height,
			0,
			gl.RGBA,
			gl.FLOAT,
			floats
		);
		return t;
	};
	
	vm.defaultFr = 1<<30;
	
	vm.vm = vm; //so Lamgl.vm is vm. Lamgl is a Proxy
	
	vm.jsNumToGlslFloat = jsNum=>{
		let s = ''+jsNum;
		if(!s.includes('.') && !s.includes('e')) s += '.'; //Examples: '3.', '3.45', '5e-10', '-5e-10'
		return s;
	};

	let Str = vm.Str = value => {
		if (value === null) return 'null';
		if (value === undefined) return 'undefined';
		if(value instanceof Float32Array) return 'Float32Array.of('+value.join(', ')+')';
		if(value.length) return JSON.stringify(value);
		if (typeof value === 'symbol') return value.toString();
		if (typeof value === 'function') return '[Function]';
		if (value instanceof WebGLTexture) return 'WebGLTexture';
		if (value instanceof vm.Tensor) return value.toString();
		if (typeof value === 'object'){
			//if(value.length) return String(value);
			//else{
				let s = '{';
				for(let key in value){
					console.log('key='+key);
					if(s.length>1) s += ',';
					s += key+': '+Str(value[key]);
				}
				return s+'}';
			//}
		}
		if(value.toString){
			return value.toString();
		}
		try {
			return 'THING';
		} catch (e) {
			return Object.prototype.toString.call(value);
		}
	};
	
	vm.timeOffset_ = performance.timing.navigationStart;
	//UTC seconds with fraction. More precise than Date.now()*.001. Chrome seems to have 4 digits after decimal point, and brave and firefox 3 digits.
	vm.time = ()=>((vm.timeOffset_+performance.now())*.001);

	const Lamgl = vm.Lamgl = new Proxy(vm, {
		apply: (target, thisArg, args) => {
			//console.log('Proxy.apply target=' + target + ' thisArg=' + thisArg + ' args=' + args);
			return target.call(...args);
		},
		get: (target, prop, receiver) => {
			//console.log('Proxy.get target=' + Str(target) + ' prop=' + Str(prop) + ' receiver=' + Str(receiver));
			if (typeof prop === "symbol") {
				// Directly pass through all symbol accesses
				return target[prop];
			}
			// Access properties like 'doBasicTests'
			if (prop in target) {
				return target[prop];
			}
			return Reflect.get(target, prop, receiver);
			//return Reflect.get(target, prop, receiver);
		}
	});
	
	vm.caches = {type: 'lamgl_caches'};
	
	//if this is nonnull (a {}), then TinyGlsl.cache(key,lazyVal) puts stats into it when lazyVal is called but does not store the output of lazyVal here.
	//TODO This could get big so it waits for it to be set to {} externally (by a button in dagball normally)
	//vm.cacheStats = null; //normal
	vm.cacheStats = {}; //test
	
	//returns the last value returned by lazyVal() or reuses it if exists for same key.
	vm.cache = function(key, lazyVal){
		if(key === undefined) throw 'key is undefined';
		if(lazyVal === undefined) throw 'lazyVal is undefined';
		let val = Lamgl.caches[key];
		if(val === undefined){
			//putTid: put a .tid field that is dagball.timeId() so can be deleted in same order as created (or reverse order?) Or might help in choosing the order in some cases?
			let startTime;
			if(Lamgl.cacheStats){
				startTime = Lamgl.time();
			}
			//val = Lamgl.caches[key] = Lamgl.putTid(lazyVal());
			val = Lamgl.caches[key] = lazyVal();
			if(Lamgl.cacheStats){
				let now = Lamgl.time();
				let map = Lamgl.cacheStats[key] = Lamgl.cacheStats[key] || {};
				let duration = now-startTime;
				map.count = (map.count|0)+1;
				map.lastDurationEndTime = now;
				map.lastDuration = duration;
				if(!map.firstDuration){
					map.firstDuration = duration;
				}
			}
		}
		return val;
	};
	
	//as comments at end of most lines
	vm.addLineNumbers = code=>{
		let lines = code.split(/(?:\r\n)|\n|\r/); //?: starts a noncapturing group, so it doesnt include those in the returned list, just whats between
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
		return code3;
	};
	
	vm.float32ArrayTranspose = (matBC,sizeB,sizeC)=>{
		let matCB = new Float32Array(sizeC*sizeB);
		for(let b=0; b<sizeB; b++) for(let c=0; c<sizeC; c++){
			matCB[c*sizeB+b] = matBC[b*sizeC+c];
		}
		return matCB;
	};
	
	vm.countNonzeros = function(floats){
		let count = 0;
		for(let i=0; i<floats.length; i++) if(floats[i]) count++;
		return count;
	};
	
	vm.testNearEqualFloatArrays = (a,b,epsilon,comment)=>{
		if(a.length != b.length) Err('TEST FAIL Array lengths differ '+a.length+' '+b.length+', '+comment);
		for(let i=0; i<a.length; i++){
			let diff = Math.abs(a[i]-b[i]);
			if(diff > epsilon) Err('TEST FAIL at i='+i+' '+a[i]+' != '+b[i]+', diff='+diff+', epsilon='+epsilon+', '+comment);
		}
		console.log('Test pass, '+comment);
	};

	vm.doBasicTests = ()=>{
		console.log('START Lamgl.doBasicTests()');
		
		let testA = Lamgl({
			sh: [1, 1, 4], //output tensor shape
			sv: `#version 300 es
				precision highp float;
				void main(){
					gl_Position = vec4(0.,0.,0.,1.0);
					gl_PointSize = 1.0;
				}`,
			sf: `#version 300 es
				precision highp float;
				out vec4 result;
				void main(){
					result = vec4(2.,3.+4.,44.,55.);
				}`,
		});
		let correctA = Float32Array.of(2.,7.,44.,55.);
		let observedA = testA.result.get();
		//console.log('testA='+JSON.stringify(testA));
		console.log('testA='+Str(testA));
		console.log('correctA='+Str(correctA));
		console.log('observedA='+Str(observedA));
		vm.testNearEqualFloatArrays(observedA,correctA,0, 'one vec4');
		
		
		console.log('doBasicTests, Lamgl='+Lamgl);
		let arr = Lamgl(Float32Array.of(2,3,4,5.67,100,200,300,400),[1,2,4]);
		console.log('doBasicTests, arr='+arr);
		let testD = Lamgl({
			sh: [128, 128, 4], //output tensor shape
			sv: `#version 300 es
				precision highp float;
				flat out int vID;
				void main(){
					int idy = gl_VertexID>>7;
					int idx = gl_VertexID&127;
					//x and y go in range -1 to 1, +.5 so its in center of pixel and doesnt get dropped
					gl_Position = vec4((float(idx)+.5)/128.*2.-1., (float(idy)+.5)/128.*2.-1., 0., 1.0);
					gl_PointSize = 1.0;
					vID = gl_VertexID; //so sf can get it
				}`,
			sf: `#version 300 es
				precision highp float;
				layout(location = 0) out vec4 result;
				flat in int vID;
				uniform sampler2D someArray;
				//todo sampler2d or something called someArray
				void main(){
					//result = vec4(gl_VertexID, 0., 0., 1.);
					float f = texelFetch(someArray, ivec2(vID&1,0), 0).x;
					result = vec4(float(vID), 7., f, 1.);
				}`,
			someArray: arr,
		});
		let correctD = new Float32Array(128*128*4);
		for(let y=0; y<128; y++) for(let x=0; x<128; x++){
			let i = (y*128+x)*4;
			let gl_VectorID = i/4;
			correctD[i] = gl_VectorID;
			correctD[i+1] = 7;
			correctD[i+2] = x&1 ? 100 : 2; //from Float32Array.of(2,3,4,5.67,100,200,300,400)
			correctD[i+3] = 1;
		}
		let observedD = testD.result.get();
		console.log('testD='+Str(testD));
		console.log('correctD='+Str(correctD));
		console.log('observedD='+Str(observedD));
		vm.testNearEqualFloatArrays(correctD,observedD,0, 'testD');
		
		
		
		/** from TinyGLSL
		let tenThousandFloatsOut = TinyGlsl.simple('', 'ret = float(id)*float(id);', Float32Array.of(0), null, 1000, 10);
		let correct5678 = 5678*5678;
		let observed5678 = tenThousandFloatsOut[5678];
		if(correct5678 != observed5678){
			throw 'correct5678='+correct5678+' observed5678='+observed5678;
		}
		console.log('tenThousandFloatsOut test pass');
		*/
		
		let tenThousandFloatsOut = Lamgl({
			sh:[100, 25, 4],
			sv:`#version 300 es
				precision highp float;
				flat out vec4 tempColor;
				float outFunc(int i){
					return float(i)*float(i); //ret = float(id)*float(id); like in TinyGLSL
				}
				const int height = 100;
				const int width = 25;
				void main(){
					int idy = gl_VertexID/width;
					int idx = gl_VertexID%width;
					gl_Position = vec4((float(idx)+.5)/float(width)*2.-1., (float(idy)+.5)/float(height)*2.-1., 0., 1.0);
					gl_PointSize = 1.0;
					int i = gl_VertexID<<2;
					tempColor = vec4(outFunc(i), outFunc(i+1), outFunc(i+2), outFunc(i+3));
				}`,
			sf:`#version 300 es
				precision highp float;
				flat in vec4 tempColor;
				layout(location = 0) out vec4 result;
				void main(){
					result = tempColor; //copy from sv
				}`
		}).result.get();
		console.log('tenThousandFloatsOut='+[...tenThousandFloatsOut].map((x,i)=>('['+i+']='+x)).join(', '));
		let correct5678 = 5678*5678;
		let observed5678 = tenThousandFloatsOut[5678];
		if(correct5678 != observed5678){
			throw 'correct5678='+correct5678+' observed5678='+observed5678;
		}
		console.log('tenThousandFloatsOut test pass');
		
		
		console.log('START test testMatmulAC');
		let sizeA = 1024;
		let sizeB = 1024;
		let sizeC = 1024;
		let flopsPerMatmul = sizeA*sizeB*sizeC*2; //*2 cuz its add and multiply.
		
		/*let sizeA = 8;
		let sizeB = 8;
		let sizeC = 8;
		*/
		let matAB = new Float32Array(sizeA*sizeB);
		let matBC = new Float32Array(sizeB*sizeC);
		for(let i=0; i<matAB.length; i++) matAB[i] = ((i*i)%117)+29;
		for(let i=0; i<matBC.length; i++) matBC[i] = i+3;
		let matCB = vm.float32ArrayTranspose(matBC,sizeB,sizeC);
		let correct_testMatmulAC = new Float32Array(sizeA*sizeC);
		for(let a=0; a<sizeA; a++){
			for(let c=0; c<sizeC; c++){
				let dotProd = 0;
				for(let b=0; b<sizeB; b++){
					dotProd += matAB[a*sizeB+b]*matBC[b*sizeC+c];
				}
				correct_testMatmulAC[a*sizeC+c] = dotProd;
			}
		}
		console.log('testMatmulAC matAB and matBC created');
		let matABTensor = Lamgl(matAB,[sizeA,sizeB/4,4]);
		let matCBTensor = Lamgl(matCB,[sizeC,sizeB/4,4]);
		console.log('matABTensor='+matABTensor);
		console.log('matCBTensor='+matCBTensor);
		for(let repeat_testMatmulAC4=0; repeat_testMatmulAC4<10; repeat_testMatmulAC4++){
			let copyToCpuInMatmulTest = repeat_testMatmulAC4<5 || repeat_testMatmulAC4==9; //so we see its speed without that in later loops
			console.log('r='+repeat_testMatmulAC4+' copyToCpuInMatmulTest='+copyToCpuInMatmulTest);
			/*console.log('repeat_testMatmulAC4='+repeat_testMatmulAC4);
			console.log('matABTensor.get()[55]='+matABTensor.get()[55]); //TODO optimize: remove this its doing an extra gpu call
			console.log('matCBTensor.get()[55]='+matCBTensor.get()[55]); //TODO optimize: remove this its doing an extra gpu call
			matABTensor.get()[55]=129 Lamgl_036.html:1211:12
			matCBTensor.get()[55]=28163 Lamgl_036.html:1212:12
			matABTensor.get()[55]=129 Lamgl_036.html:1211:12
			matCBTensor.get()[55]=28163
			so the data is still in them.
			*/
			let testMatmulAC4_timeStart = vm.time();
			let observed_testMatmulAC4 = null;
			let observed_testMatmulAC4_map = null;
			try{
				let testMatmulAC4_sh = [sizeA, sizeC/4, 4];
				observed_testMatmulAC4_map = Lamgl({
					sh: testMatmulAC4_sh,
					sv: `#version 300 es
						precision highp float;
						const int height = ${testMatmulAC4_sh[0]};
						const int width = ${testMatmulAC4_sh[1]};
						const int sizeA = ${sizeA};
						const int sizeBOver4 = ${sizeB/4};
						const int sizeC = ${sizeC};
						uniform sampler2D matAB;
						uniform sampler2D matCB;
						flat out vec4 tempColor;
						void main(){
							int idy = gl_VertexID / width; // row (A)
							int idx = gl_VertexID % width; // column block (C/4)
							/*tempColor = vec4(
								dotProd(idy, idx*4+0),
								dotProd(idy, idx*4+1),
								dotProd(idy, idx*4+2),
								dotProd(idy, idx*4+3)
							);*/
							vec4 sums = vec4(1.); //vec4 sums = vec4(0);
							for (int b=0; b<sizeBOver4; b++){
								vec4 mul = texelFetch(matAB,ivec2(b,idy),0);
								sums += vec4(
									dot(mul,texelFetch(matCB,ivec2(b,idx*4+0),0)),
									dot(mul,texelFetch(matCB,ivec2(b,idx*4+1),0)),
									dot(mul,texelFetch(matCB,ivec2(b,idx*4+2),0)),
									//*1.0000001 avoid returning all 0s, force it to to do some calculation
									//thats not from the textures, cuz the glsl optimizer is buggy.
									//dot(mul,texelFetch(matCB,ivec2(b,idx*4+3),0))*1.000001
									dot(mul,texelFetch(matCB,ivec2(b,idx*4+3),0))
								);
							}
							tempColor = sums;
							gl_Position = vec4((float(idx)+.5)/float(width)*2.-1.,
								(float(idy)+.5)/float(height)*2.-1., 0., 1.0);
							//gl_PointSize = 1.0;
							gl_PointSize = 1.;
							//float sum1 = 0.;
							//float sum2 = 0.;
							//float sum3 = 0.;
							/*for (int b1=0; b1<sizeBOver4; b1++){
								vec4 ba = texelFetch(matAB,ivec2(b1,idy),0);
								vec4 bc = texelFetch(matCB,ivec2(b1,idx*4+1),0);
								sum1 += dot(ba, bc);
							}
							float sum2 = 0.;
							for (int b=0; b<sizeBOver4; b++){
								vec4 ba = texelFetch(matAB,ivec2(b,idy),0);
								vec4 bc = texelFetch(matCB,ivec2(b,idx*4+2),0);
								sum2 += dot(ba, bc);
							}
							float sum3 = 0.;
							for (int b=0; b<sizeBOver4; b++){
								vec4 ba = texelFetch(matAB,ivec2(b,idy),0);
								vec4 bc = texelFetch(matCB,ivec2(b,idx*4+3),0);
								sum3 += dot(ba, bc);
							}*/
							//tempColor = vec4(sum0, sum1, sum2, sum3);
						}`,
					sf: `#version 300 es
						precision highp float;
						flat in vec4 tempColor;
						layout(location = 0) out vec4 result;
						void main() {
							//result = tempColor;
							//result = tempColor/1.000001; //undo *1.0000001 (glsl optimizer bug)
							result = tempColor-1.; //undo +1 (glsl optimizer bug)
						}`,
					matAB: matABTensor,
					matCB: matCBTensor,
				});

				
				console.log('observed_testMatmulAC4_map='+observed_testMatmulAC4_map);
				if(copyToCpuInMatmulTest){
					observed_testMatmulAC4 = observed_testMatmulAC4_map.result.get();
					//FIXME what kind of transpose-like op goes here? let observed_testMatmulAC = vm.float32ArrayTranspose(observed_testMatmulAC4,size
					/*let cor = [...correct_testMatmulAC];
					for(let i=0; i<1000; i++){
						let ind = cor.indexOf(observed_testMatmulAC[i]);
						console.log('i='+i+' ind='+ind);
					}*/
					let cor = [...correct_testMatmulAC];
					let obs4 = [...observed_testMatmulAC4];
					for(let i=0; i<Math.min(100,correct_testMatmulAC.length); i++){
						console.log('i='+i+' cor='+correct_testMatmulAC[i]+'@'+obs4.indexOf(correct_testMatmulAC[i])+' obs4='+observed_testMatmulAC4[i]+'@'+cor.indexOf(observed_testMatmulAC4[i]));
					}
					let epsilon = (.3*sizeB)**2; //FIXME?
					vm.testNearEqualFloatArrays(correct_testMatmulAC, observed_testMatmulAC4, epsilon, 'testMatmulAC_r'+repeat_testMatmulAC4);
					//vm.testNearEqualFloatArrays(correct_testMatmulAC, observed_testMatmulAC, .00001, 'testMatmulAC_r'+repeat_testMatmulAC4);
					//let matCB = vm.float32ArrayTranspose(matBC,sizeB,sizeC);
					/*
					console.log('testMatmulAC4 test code incompletely written. todo fix it.');
					for(let i=0; i<32; i++) console.log('i='+i+' val='+observed_testMatmulAC4[i]);
					let numNonzero_observed_testMatmulAC4 = 0;
					for(let i=0; i<observed_testMatmulAC4.length; i++) if(observed_testMatmulAC4[i]) numNonzero_observed_testMatmulAC4++;
					console.log('numNonzero_observed_testMatmulAC4='+numNonzero_observed_testMatmulAC4);
					vm.testNearEqualFloatArrays(correct_testMatmulAC, observed_testMatmulAC4, .00001, 'testMatmulAC_r'+repeat_testMatmulAC4);
					*/
				}
			}finally{
				let secs = vm.time()-testMatmulAC4_timeStart;
				let flopPerSec = flopsPerMatmul/secs;
				console.log('repeat_testMatmulAC4='+repeat_testMatmulAC4+' testMatmulAC4 secs='+secs+' gigaflopPerSec(TODO get this up to 100 like in TinyGLSL)='+(flopPerSec/1e9)+' observed_testMatmulAC4.length='+(observed_testMatmulAC4?observed_testMatmulAC4.length:'undefined'));
				if(observed_testMatmulAC4_map) for(let k in observed_testMatmulAC4_map){
					let val = observed_testMatmulAC4_map[k];
					if(val instanceof vm.Tensor){
						val.free(); //return WebGLTexture to pool
					}
				}
			}
		}
		
		/* ===========================================================
			 NEW TEST – geometry chosen implicitly via `in vec2 XY;`
			 Expectation: Lamgl must detect the attribute name, switch
			 to “two-triangle quad” geometry, fill a 40 × 30 tensor,
			 and give us	 value = 1000*y + x	 at each pixel.
			 ===========================================================*/
		{
			const H = 30, W = 40;				 // small so we can eyeball failures
			const quadTest = Lamgl({
				sh: [H, W, 4],
				sv: `#version 300 es
					 precision highp float;
					 in vec2 XY; //triggers quad/rectangle/twoTriangles geometry, dont use gl_ VertexID.
					 void main (){
						 gl_Position = vec4(XY, 0., 1.); //pass-through clip-space
					 }`,

				sf: `#version 300 es
					//fragment: encode 1000*y + x into .r
					 precision highp float;
					 layout(location=0) out vec4 result;
					 void main () {
						 int x = int(gl_FragCoord.x) - 0;	 // 0..W-1
						 int y = int(gl_FragCoord.y) - 0;	 // 0..H-1
						 result = vec4(float(1000*y + x), 0.0, 0.0, 1.0);
					 }`
			});
			//pull back to CPU and verify
			const data = quadTest.result.get(); //Float32Array
			let ok = true;
			for (let y = 0; y < H; ++y) {
				for (let x = 0; x < W; ++x) {
					const i = (y*W + x) * 4;
					const expected = 1000*y + x;
					if (data[i] !== expected) {
						console.error(`quadTest mismatch at (x=${x}, y=${y}): `
										+ `got ${data[i]}, expected ${expected}`);
						ok = false;
						break;
					}
				}
				if (!ok) break;
			}
			if (!ok) throw 'quadTest failed – Lamgl did not switch to QUAD geometry';
			console.log('quadTest passed – Lamgl QUAD geometry ok');
		}
		/*2025-6-25-546pET[
		Test pass, one vec4
		bellsack145_todoForkingFrom142Cuz(gl_VertexID)IsSlowInBellsackRaytracingSoGoingBackTo2Triangles.html:1079 Test pass, testD
		bellsack145_todoForkingFrom142Cuz(gl_VertexID)IsSlowInBellsackRaytracingSoGoingBackTo2Triangles.html:1197 tenThousandFloatsOut test pass
		bellsack145_todoForkingFrom142Cuz(gl_VertexID)IsSlowInBellsackRaytracingSoGoingBackTo2Triangles.html:1079 Test pass, testMatmulAC_r0
		bellsack145_todoForkingFrom142Cuz(gl_VertexID)IsSlowInBellsackRaytracingSoGoingBackTo2Triangles.html:1079 Test pass, testMatmulAC_r1
		bellsack145_todoForkingFrom142Cuz(gl_VertexID)IsSlowInBellsackRaytracingSoGoingBackTo2Triangles.html:1079 Test pass, testMatmulAC_r2
		bellsack145_todoForkingFrom142Cuz(gl_VertexID)IsSlowInBellsackRaytracingSoGoingBackTo2Triangles.html:1079 Test pass, testMatmulAC_r3
		bellsack145_todoForkingFrom142Cuz(gl_VertexID)IsSlowInBellsackRaytracingSoGoingBackTo2Triangles.html:1079 Test pass, testMatmulAC_r4
		bellsack145_todoForkingFrom142Cuz(gl_VertexID)IsSlowInBellsackRaytracingSoGoingBackTo2Triangles.html:1079 Test pass, testMatmulAC_r9
		bellsack145_todoForkingFrom142Cuz(gl_VertexID)IsSlowInBellsackRaytracingSoGoingBackTo2Triangles.html:1406 quadTest passed – Lamgl QUAD geometry ok
		]*/

		
		//Lamgl.testDisplay(true,Lamgl.time()); //FIXME remove this cuz its UI stuff
		
		console.log('END Lamgl.doBasicTests()');
	};
	
	vm.Tensor.prototype.copyTo = function(canvas){
		if(canvas != vm.glCanv){
			Todo('also support copying (slower) to other canvases than vm.glCanv aka Lamgl.glCanv. Its built into WebGL2 that if you give null as FrameBuffer, it writes to the canvas that WebGL2 was made from. To copy to another canvas youd have to copy from that canvas to another one or on some other path.');
		}
		if(this.sh.length != 3){
			Err('this.sh.length='+this.sh.length+' but expected [height, width, 4]');
		}
		let [h, w, ch] = this.sh;
		vm.setCanvasSize(canvas, h, w);
		Lamgl({
			sh: this.sh,
			sv: `#version 300 es
				//sv tensor.copyTo for tensor.display() to canvas
				void main() {
					int id = gl_VertexID;
					int idx = id % ${w};
					int idy = id / ${w};
					float x = (float(idx) + 0.5) / float(${w});
					float y = (float(idy) + 0.5) / float(${h});
					gl_Position = vec4(x * 2.0 - 1.0, y * 2.0 - 1.0, 0.0, 1.0);
					gl_PointSize = 1.0;
				}
			`,
			sf: `#version 300 es
				//sf tensor.copyTo for tensor.display() to canvas
				precision highp float;
				uniform sampler2D tex;
				out vec4 outColor;
				void main() {
					ivec2 uv = ivec2(gl_FragCoord.xy);
					outColor = texelFetch(tex, uv, 0);
				}
			`,
			tex: this,
			sc: true, //output to Lamgl.glCanv aka vm.glCanv, the canvas that the WebGL2 was made from.
		});
	};
	
	vm.Tensor.prototype.display = function(){
		let canvas = vm.glCanv;
		vm.putCanvasInDomOnce(canvas);
		this.copyTo(canvas);
	};
	
	vm.putCanvasInDomOnce = function(canvas){ //does nothing if the canvas is already in the dom. Normally called on Lamgl.glCanv aka vm.glCanv
		if(!document.body.contains(canvas)){
			canvas.style.position = 'fixed';
			canvas.style.left = '0px';
			canvas.style.top = '0px';
			canvas.style.width = '100%';
			canvas.style.height = '100%';
			canvas.style.zIndex = '-10'; // behind most content
			canvas.style.border = 'none';
			document.body.appendChild(canvas);
		}
		return canvas;
	};
	
	vm.setCanvasSize = function(canvas, h, w){
		if(canvas.width !== w || canvas.height !== h){
			canvas.width = w;
			canvas.height = h;
		}
	};
	
	vm.testDisplay = (isSparse, isDetailedLog, time)=>{
		console.log('Start testDisplay');
		let t = time || vm.time();
		const height = 400, width = 300;
		let tSmall = t%86400; //cuz float64 time cast to float32 loses the part of time that changes fast enuf to see
		let mapOut = Lamgl({
			sh: [height, width, 4],
			tSmall: tSmall,
			sv: `#version 300 es
				precision highp float;
				const int height = ${height};
				const int width = ${width};
				out vec2 uv;
				${isSparse ? '//sparsePoints' : 'in vec2 XY; //twoTriangles'}
				//const float tSmall = ${vm.jsNumToGlslFloat(tSmall)}; //TODO do this in uniform so Lamgl doesnt compile again every time
				void main(){
					${isSparse?
						`int idy = gl_VertexID / width;
						int idx = gl_VertexID % width;
						uv = vec2(float(idx)/float(width), float(idy)/float(height));
						gl_Position = vec4((float(idx)+.5)/float(width)*2. - 1.,
											(float(idy)+.5)/float(height)*2. - 1., 0., 1.);
						gl_PointSize = 1.0;`
						:
						`uv = XY * 0.5 + 0.5;
						gl_Position = vec4(XY, 0.0, 1.0);`
					}
				}`,
			sf: `#version 300 es
				precision highp float;
				uniform float tSmall;
				layout(location = 0) out vec4 outColor;
				in vec2 uv;
				void main(){
					float r = 0.5 + 0.5 * sin(sin(tSmall*.567) + uv.x * 20.0 + uv.y * 10.0);
					float g = 0.5 + 0.5 * cos(tSmall+cos(tSmall*1.876-uv.x*r) + uv.y * 30.0 - uv.x * 5.0);
					float b = 0.5 + 0.5 * sin(uv.x * 40.0 + uv.y * 40.0);
					//tempColor = vec4(1., .5, .4, 1.0);
					outColor = vec4(r, g, b, 1.0);
				}`,
		});
		
		let tensorOut = mapOut.outColor;
		if(!tensorOut){
			Err('No tensorOut');
		}
		console.log('tensorOut.sh='+JSON.stringify(tensorOut.sh));
		if(isDetailedLog){
			let floats = tensorOut.get();
			if(floats.length != height*width*4){
				Err('floats.length='+floats.length+' but expected height*width*4='+(height*width*4));
			}
			console.log('testDisplay contents: ');
			let countNonzeros = 0;
			for(let y=0; y<height; y++){
				let line = '';
				for(let x=0; x<width; x++){
					line += ' '
					for(let c=0; c<4; c++){
						if(c) line += ',';
						let f = floats[(y*width+x)*4+c];
						if(f) countNonzeros++;
						line += f;
					}
				}
				console.log(line);
			}
			if(!countNonzeros){
				Err('testDisplay, all '+floats.length+' floats from GPU are 0');
			}
		}
		//uses {sc:true} to output to canvas, that canvas being Lamgl.glCanv, and resizes if needed to match tensor size
		//and put thats canvas in dom tree if its not already.
		tensorOut.display();
	};

	return vm.Lamgl;
	//requestAnimationFrame(() => { Lamgl.doBasicTests(); });
})();