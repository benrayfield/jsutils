/* Stak.js — direct JavaScript compiler and GLSL stack generator.
	Prototype; no Bellsack modifications or Lamgl dependency.
	Generated GLSL helpers require a host shader. Hash labels are opaque names.
*/
/* Stak.js prototype: whitespace language, checked float32 stream, isolated functions.
 * Parsing and validation allocate at compile time. Generated calls use primitive locals.
 * demoHash suffixes are ordinary names; cryptographic name verification is not implemented.
 */
const Stak=globalThis.Stak=(()=>{
	'use strict';
	const own=(object,key)=>Object.prototype.hasOwnProperty.call(object,key);
	const identifier=/^[A-Za-z_$][A-Za-z0-9_$]*$/;
	const floatLiteral=/^[+-]?(?:(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?|Infinity|NaN)$/;
	const intLiteral=/^[+-]?\d+$/;
	const limits={maxOps:10000000,maxFrames:128,maxArrayFloats:1000000};
	const fail=message=>{throw new Error('Stak: '+message);};
	const checkedInt=value=>{
		if(!Number.isInteger(value)||value< -2147483648||value>2147483647) fail('integer overflow or non-integer: '+value);
		return value;
	};
	const positiveMod=(a,b)=>{
		if(b<=0) fail('integer modulo requires a positive divisor');
		return ((a%b)+b)%b;
	};
	const floatOps=Object.create(null),intOps=Object.create(null);
	const fop=(name,inputs,fn,glsl)=>{floatOps[name]={inputs,outputs:1,fn,glsl};};
	const iop=(name,inputs,fn,glsl)=>{intOps[name]={inputs,outputs:1,fn,glsl};};
	fop('WWaddM',2,(a,b)=>a+b,'+');
	fop('WWsubM',2,(a,b)=>a-b,'-');
	fop('WWmulM',2,(a,b)=>a*b,'*');
	fop('WWdivM',2,(a,b)=>a/b,'/');
	fop('WWmaxM',2,Math.max,'max');
	fop('WWminM',2,Math.min,'min');
	fop('WWpowM',2,Math.pow,'pow');
	fop('WWatan2M',2,Math.atan2,'atan2');
	fop('WWWadd3M',3,(a,b,c)=>a+b+c,'add3');
	fop('WnegM',1,a=>-a,'neg');
	fop('WabsM',1,Math.abs,'abs');
	fop('WsqrtM',1,Math.sqrt,'sqrt');
	fop('WexpM',1,Math.exp,'exp');
	fop('WlogM',1,Math.log,'log');
	fop('WsinM',1,Math.sin,'sin');
	fop('WcosM',1,Math.cos,'cos');
	fop('WtanM',1,Math.tan,'tan');
	fop('WasinM',1,Math.asin,'asin');
	fop('WacosM',1,Math.acos,'acos');
	fop('WatanM',1,Math.atan,'atan');
	fop('WfloorM',1,Math.floor,'floor');
	fop('WceilM',1,Math.ceil,'ceil');
	fop('WtruncM',1,Math.trunc,'trunc');
	fop('WsignM',1,Math.sign,'sign');
	fop('WfractM',1,a=>a-Math.floor(a),'fract');
	fop('WtanhM',1,Math.tanh,'tanh');
	fop('WsigmoidM',1,a=>a>=0?1/(1+Math.exp(-a)):Math.exp(a)/(1+Math.exp(a)),'sigmoid');
	fop('WsoftplusM',1,a=>Math.max(0,a)+Math.log1p(Math.exp(-Math.abs(a))),'softplus');
	iop('JJiaddC',2,(a,b)=>a+b,'add');
	iop('JJisubC',2,(a,b)=>a-b,'sub');
	iop('JJimulC',2,(a,b)=>a*b,'mul');
	iop('JJidivC',2,(a,b)=>{
		if(b===0) fail('integer division by zero');
		return Math.trunc(a/b);
	},'div');
	iop('JJimodC',2,positiveMod,'mod');
	iop('JJiminC',2,Math.min,'min');
	iop('JJimaxC',2,Math.max,'max');
	iop('Jiadd1C',1,a=>a+1,'add1');

	function newStakstream(capacity=64){
		if(!Number.isSafeInteger(capacity)||capacity<0||capacity>16777216) fail('capacity must be an integer from 0 through 16777216');
		const state={floats:new Float32Array(capacity),sp:0};
		function stakstream(value){
			if(arguments.length===0){
				if(state.sp===0) fail('stream underflow');
				return state.floats[--state.sp];
			}
			if(arguments.length!==1||typeof value!=='number') fail('stakstream expects zero arguments, or one number');
			if(state.sp===capacity) fail('stream overflow: capacity '+capacity);
			state.floats[state.sp++]=value;
		}
		Object.defineProperties(stakstream,{
			depth:{get:()=>state.sp},
			capacity:{value:capacity},
			clear:{value:()=>{state.sp=0;}},
			toArray:{value:()=>Array.from(state.floats.subarray(0,state.sp))}
		});
		return stakstream;
	}

	function markerCount(marker,letter){
		if(!marker) return 0;
		if(marker==='Q') return null;
		const count=/\d/.test(marker)?Number(marker.slice(1)):marker.length;
		if(!Number.isSafeInteger(count)||count<1||count>2147483647) fail('invalid '+letter+' count: '+marker);
		return count;
	}
	function signature(name){
		if(!identifier.test(name)) fail('invalid function identifier '+name);
		const match=/^(J\d+|J+)?(W\d+|W+|Q)?(.+?)(C\d+|C+)?(M\d+|M+|Q)?$/.exec(name);
		if(!match||!identifier.test(match[3])) fail('invalid function signature '+name);
		return {
			floatInputs:markerCount(match[2],'W'),
			floatOutputs:markerCount(match[5],'M'),
			intInputs:markerCount(match[1],'J'),
			intOutputs:markerCount(match[4],'C')
		};
	}
	function tokenize(source){
		if(typeof source!=='string') fail('source must be a string');
		source=source.replace(/\r\n/g,'\n').replace(/\r/g,'\n');
		const sourceLines=source.split('\n');
		let clean='',at=0,line=1,column=1;
		while(at<source.length){
			if(source.slice(at,at+2)==='/*'){
				const end=source.indexOf('*/',at+2);
				if(end<0) fail('unclosed block comment');
				clean+=source.slice(at,end+2).replace(/[^\n]/g,' ');
				at=end+2;
			}else if(source.slice(at,at+2)==='//'){
				let end=source.indexOf('\n',at+2);
				if(end<0) end=source.length;
				clean+=' '.repeat(end-at);
				at=end;
			}else clean+=source[at++];
		}
		const records=[];
		for(const match of clean.matchAll(/\s+|\S+/g)){
			const text=match[0];
			if(!/^\s/.test(text)) records.push({text,line,column,indent:sourceLines[line-1].match(/^[\t ]*/)[0]});
			const parts=text.split('\n');
			if(parts.length>1){line+=parts.length-1;column=parts[parts.length-1].length+1;}
			else column+=text.length;
		}
		return records;
	}
	function parse(source){
		const tokens=tokenize(source),definitions=Object.create(null),topLevel=[];
		let at=0,defaultEntry=null;
		const error=(record,message)=>fail(message+' at line '+(record?record.line:1)+(record?' ('+record.text+')':''));
		function block(end,functionName){
			const body=[],locations=[];
			Object.defineProperty(body,'locations',{value:locations});
			while(at<tokens.length){
				const record=tokens[at++],token=record.text;
				if((end==='Kolb'&&(token==='Kolb'||token==='Klob'))||token===end) return body;
				if(token==='Kolb'||token==='Klob'||token==='Pool') error(record,'unexpected '+token);
				if(token.endsWith('Blok')) error(record,'nested function definitions are not supported');
				locations.push(record);
				if(token==='Loop') body.push({kind:'loop',body:block('Pool',functionName),line:record.line});
				else body.push(token);
			}
			error(tokens[tokens.length-1],'missing '+end+' in '+functionName);
		}
		Object.defineProperty(topLevel,'locations',{value:[]});
		while(at<tokens.length){
			const record=tokens[at++],token=record.text;
			if(token.endsWith('Blok')){
				const name=token.slice(0,-4);
				if(own(definitions,name)||own(floatOps,name)||own(intOps,name)||name==='Ji2fM') error(record,'duplicate or reserved function '+name);
				definitions[name]={name,signature:signature(name),body:block('Kolb',name),line:record.line};
				defaultEntry=name;
			}else{
				if(token==='Kolb'||token==='Klob'||token==='Pool') error(record,'unexpected '+token);
				topLevel.locations.push(record);
				topLevel.push(token==='Loop'?{kind:'loop',body:block('Pool','top level'),line:record.line}:token);
			}
		}
		const ast={definitions,topLevel,defaultEntry};
		const walk=(body,fn)=>{for(const token of body) typeof token==='string'?fn(token):walk(token.body,fn);};
		const active=new Set(),done=new Set();
		function checkCalls(name,path){
			if(active.has(name)) fail('recursive call cycle: '+path.concat(name).join(' -> '));
			if(done.has(name)) return;
			active.add(name);
			walk(definitions[name].body,token=>{if(own(definitions,token)) checkCalls(token,path.concat(name));});
			active.delete(name);done.add(name);
		}
		Object.keys(definitions).forEach(name=>checkCalls(name,[]));
		return ast;
	}

	function binding(token,letter){
		const match=new RegExp('^([A-Za-z_$][A-Za-z0-9_$]*?)('+letter+'+)$').exec(token);
		return match?{name:match[1],width:match[2].length}:null;
	}
	function lookupInt(scope,name){
		if(!(name in scope)) fail('unknown integer '+name);
		return scope[name];
	}
	function popInteger(stack){
		if(!stack.length) fail('integer stack underflow');
		return stack.pop();
	}
	function applyInteger(token,stack){
		const op=intOps[token];
		if(stack.length<op.inputs) fail('integer stack underflow at '+token);
		const args=stack.splice(stack.length-op.inputs,op.inputs);
		stack.push(checkedInt(op.fn(...args)));
	}
	function sizeFor(stack,bound){
		if(bound.width!==1&&stack.length) fail('use either grouped W/L markers or an integer array size, not both');
		const size=stack.length?popInteger(stack):bound.width;
		if(size<0||size>limits.maxArrayFloats) fail('array size '+size+' exceeds allowed range 0..'+limits.maxArrayFloats);
		return size;
	}

	// Evaluate only the declaration prefix. This determines the exact input frame
	// for Q functions before any caller float can be popped.
	function prepare(definition,intArgs,definitions){
		const sig=definition.signature;
		if(intArgs.length!==sig.intInputs) fail(definition.name+' expects '+sig.intInputs+' integer inputs, got '+intArgs.length);
		const stack=intArgs.map(checkedInt),ints=Object.create(null),specs=[];
		const names=new Set();
		let parameterCount=0,localCount=0,end=0;
		for(;end<definition.body.length;end++){
			const token=definition.body[end];
			if(typeof token!=='string'||own(definitions,token)||own(floatOps,token)) break;
			try{
				if(own(intOps,token)) applyInteger(token,stack);
				else if(token.startsWith('C')){
					const name=token.slice(1);
					stack.push(intLiteral.test(name)?checkedInt(Number(name)):lookupInt(ints,name));
				}else if(binding(token,'J')){
					const bound=binding(token,'J');
					if(bound.width!==1) fail('an integer name binds exactly one value');
					if(names.has(bound.name)) fail('duplicate or immutable name '+bound.name);
					names.add(bound.name);ints[bound.name]=popInteger(stack);
				}else{
					const param=binding(token,'W'),local=binding(token,'L'),bound=param||local;
					if(!bound) break;
					if(names.has(bound.name)) fail('duplicate name '+bound.name);
					names.add(bound.name);
					const size=sizeFor(stack,bound);
					specs.push({kind:param?'param':'local',name:bound.name,size});
					if(param) parameterCount+=size;else localCount+=size;
					if(parameterCount+localCount>limits.maxArrayFloats) fail('function declarations exceed maxArrayFloats');
				}
			}catch(error){
				throw contextError(error,definition.name,token,definition.body.locations?.[end]?.line);
			}
		}
		const inputs=sig.floatInputs===null?parameterCount:sig.floatInputs;
		if(parameterCount>inputs) fail(definition.name+' parameter declarations consume '+parameterCount+' floats but its signature allows '+inputs);
		return {inputs,parameterCount,localCount,specs,ints,intStack:stack,end};
	}
	function contextError(error,name,token,line){
		const detail=error instanceof Error?error.message:String(error);
		const wrapped=new Error(detail+'\n  in '+name+(line?' at line '+line:'')+(token?' ['+token+']':''));
		wrapped.cause=error;
		return wrapped;
	}

	return {
		version:'0.2.0-direct-js',newStakstream,newStakStream:newStakstream,parse,limits,
		_internals:{parse,signature,floatOps,intOps,prepare,binding,checkedInt}
	};
})();

/* Direct JS backend: compile-time objects; invocation uses only scalar locals and the supplied stream. */
(function(Stak){
	'use strict';
	const internal=Stak._internals,own=(object,key)=>Object.prototype.hasOwnProperty.call(object,key);
	const floatLiteral=/^[+-]?(?:(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?|Infinity|NaN)$/;
	const numberText=value=>Object.is(value,-0)?'-0':String(value);
	// User scalar names stay unchanged. This small namespace is reserved for emitted JS.
	const reservedNames=new Set(('s Math NaN Infinity undefined arguments eval '+
		'await break case catch class const continue debugger default delete do else enum export extends false finally for function if implements import in instanceof interface let new null package private protected public return static super switch this throw true try typeof var void while with yield').split(' '));
	const scratch=['_stakA','_stakB','_stakC','_stakD'];
	const indentWidth=text=>[...text].reduce((width,char)=>width+(char==='\t'?4:1),0);
	Stak.eval=function(source,options){
		options=options||{};
		const inline=options.inline===true;
		source=typeof source==='string'?source.replace(/\r\n/g,'\n').replace(/\r/g,'\n'):source;
		const ast=internal.parse(source),definitions=Object.assign(Object.create(null),ast.definitions);
		const names=Object.keys(ast.definitions),variants=new Map(),entries=new Map(),active=new Set();
		const maxSourceChars=options.maxSourceChars===undefined?1000000:options.maxSourceChars;
		const maxAnalysisSteps=options.maxAnalysisSteps===undefined?5000000:options.maxAnalysisSteps;
		if(!Number.isSafeInteger(maxSourceChars)||maxSourceChars<1||!Number.isSafeInteger(maxAnalysisSteps)||maxAnalysisSteps<1) throw new Error('Stak JS: compilation budgets must be positive safe integers.');
		let serial=0,analysisSteps=0;
		const fail=(context,message)=>{throw new Error('Stak JS '+context.name+': '+message);};
		if(ast.topLevel.length) definitions['@topLevel']={name:'@topLevel',synthetic:true,signature:{floatInputs:null,floatOutputs:null,intInputs:0,intOutputs:0},body:ast.topLevel};
		function compile(name,intArgs){
			const key=JSON.stringify([name,intArgs]);
			if(variants.has(key)) return variants.get(key);
			const def=definitions[name];
			if(!def) throw new Error('Stak JS: unknown function '+name);
			if(active.has(name)) throw new Error('Stak JS: recursive call '+name);
			if(active.size>=Stak.limits.maxFrames) throw new Error('Stak JS: call depth exceeds maxFrames.');
			const prepared=internal.prepare(def,intArgs,definitions);
			active.add(name);
			const id=serial++,functionName=def.synthetic?'Stak_topLevel':name+'_js'+id;
			const context={name,height:0,min:0,peak:0,locals:new Map(),iStack:intArgs.map(v=>({v:internal.checkedInt(v),code:String(v),constant:true})),ints:new Map(),header:true,declarations:[],children:new Set(),chars:0,ops:0,estimatedFlops:0,loopSerial:0,loops:0,unrolledIterations:0,codeNames:new Set(),usedScratch:0,tempSerial:0};
			const checkName=variable=>{if(reservedNames.has(variable)||variable.startsWith('_stak')) fail(context,'reserved name '+variable+'; s, JavaScript keywords, Math, NaN, Infinity, undefined, arguments, eval, and the _stak prefix are reserved.');};
			const adjust=delta=>{context.height+=delta;context.min=Math.min(context.min,context.height);context.peak=Math.max(context.peak,context.height);};
			const popInt=()=>{if(!context.iStack.length) fail(context,'integer stack underflow.');return context.iStack.pop();};
			const local=(name,writable)=>{
				const value=context.locals.get(name);
				if(!value) fail(context,'unknown '+(writable?'local ':'float parameter/local ')+name+'.');
				if(writable&&value.parameter) fail(context,'cannot write readonly parameter '+name+'.');
				return value;
			};
			const at=(value,index,read)=>{
				if(!index.constant) fail(context,'array index needs compile-time specialization.');
				if(index.v<0||index.v>=value.width) fail(context,'array bounds: '+value.name+'['+index.v+'] has size '+value.width+'.');
				if(read&&!value.init.has(index.v)) fail(context,'uninitialized '+value.name+'['+index.v+'].');
				return value.codes[index.v];
			};
			function walk(body,emit,scope,depth,minimumIndent=1){
				const lines=[],pending=[];
				let tokenIndent=depth+1;
				const put=(line,count=true)=>{
					if(!emit) return;
					if(count) context.chars+=line.length+1;
					if(context.chars>maxSourceChars) fail(context,'generated JS exceeds maxSourceChars='+maxSourceChars+'; indexed arrays are scalarized. Increase this explicit compile-time budget only if appropriate.');
					lines.push(count?'\t'.repeat(tokenIndent)+line:line);
				};
				// Symbolic values are compile-time objects only. A mutation snapshots any
				// older pending reads; calls and loops commit the pending float stack.
				const temporary=value=>{
					const name='_stakT'+context.tempSerial++;
					context.declarations.push(name);put(name+'='+value.code+';');
					return {code:name,reads:new Set()};
				};
				const pushFloat=(code,reads=[])=>{
					if(inline&&emit) pending.push({code,reads:new Set(reads)});
					else put('s('+code+');');
				};
				const takeFloat=()=>pending.length?pending.pop():temporary({code:'s()'});
				const flush=()=>{for(const value of pending) put('s('+value.code+');');pending.length=0;};
				const writeFloat=code=>{
					if(!inline||!emit){put(code+'=s();');return;}
					const value=pending.length?pending.pop():{code:'s()'};
					for(let i=0;i<pending.length;i++) if(pending[i].reads.has(code)) pending[i]=temporary(pending[i]);
					put(code+'='+value.code+';');
				};
				for(let tokenIndex=0;tokenIndex<body.length;tokenIndex++){
					const token=body[tokenIndex],record=body.locations?.[tokenIndex];
					tokenIndent=Math.max(minimumIndent,depth+1,Math.ceil(indentWidth(record?.indent||'')/4));
					if(++analysisSteps>maxAnalysisSteps) fail(context,'static validation exceeds maxAnalysisSteps='+maxAnalysisSteps+'.');
					if(typeof token!=='string'){
						flush();
						if(token.kind!=='loop') fail(context,'unknown AST node.');
						context.header=false;
						const count=popInt(),counterBinding=typeof token.body[0]==='string'?internal.binding(token.body[0],'J'):null;
						if(!count.constant) fail(context,'Loop count must resolve to a compile-time integer.');
						if(count.v<0) fail(context,'negative Loop count.');
						if(!counterBinding||counterBinding.width!==1) fail(context,'Loop must begin with an immutable counter binding such as indexJ.');
						const flat=[];
						const flatten=list=>{for(const item of list) typeof item==='string'?flat.push(item):flatten(item.body);};
						flatten(token.body);
						const usesCounter=flat.includes('C'+counterBinding.name);
						const needsFixed=flat.some(text=>/^J_|^JW_/.test(text)||(own(definitions,text)&&definitions[text].signature.intInputs>0));
						const unroll=usesCounter&&needsFixed;
						checkName(counterBinding.name);
						if(context.declarations.includes(counterBinding.name)) fail(context,'generated name collision for loop counter '+counterBinding.name+'.');
						const counter=counterBinding.name,intBaseline=context.iStack.slice();
						context.codeNames.add(counter);
						if(emit&&!unroll){context.loops++;put('for(let '+counter+'=0;'+counter+'<'+count.v+';'+counter+'++){');}
						for(let i=0;i<count.v;i++){
							context.iStack.push({v:i,code:unroll?String(i):counter,constant:unroll});
							const nested=walk(token.body,emit&&(unroll||i===0),new Map(scope),depth+1,tokenIndent+1);
							if(context.iStack.length!==intBaseline.length||context.iStack.some((v,j)=>v!==intBaseline[j])) fail(context,'integer stack imbalance in Loop.');
							if(emit&&(unroll||i===0)) for(const line of nested) put(line,false);
							if(emit&&unroll) context.unrolledIterations++;
						}
						if(!unroll) put('}');
						continue;
					}
					let match;
					if(token==='Ji2fM'){
						context.header=false;adjust(1);context.estimatedFlops++;pushFloat(popInt().code);continue;
					}
					if(own(internal.floatOps,token)){
						context.header=false;
						const op=internal.floatOps[token],args=scratch.slice(0,op.inputs);
						if(op.outputs!==1||op.inputs>4) fail(context,'unsupported primitive '+token+'.');
						adjust(-op.inputs);adjust(1);context.ops++;
						context.estimatedFlops+=op.glsl==='add3'?2:1;
						if(inline&&emit){
							const values=[];
							for(let i=op.inputs-1;i>=0;i--) values[i]=takeFloat();
							if(['fract','softplus'].includes(op.glsl)&&!/^[-+\w.$]+$/.test(values[0].code)) values[0]=temporary(values[0]);
							pushFloat(floatExpression(op.glsl,values.map(value=>/^(?:[A-Za-z_$][\w$]*|\d+(?:\.\d+)?(?:e[+-]?\d+)?)$/.test(value.code)?value.code:'('+value.code+')')),values.flatMap(value=>[...value.reads]));
						}else{
							if(emit) context.usedScratch=Math.max(context.usedScratch,op.inputs);
							for(let i=op.inputs-1;i>=0;i--) put(args[i]+'=s();');
							put('s('+floatExpression(op.glsl,args)+');');
						}
						continue;
					}
					if(own(internal.intOps,token)){
						const op=internal.intOps[token],args=[];
						for(let i=0;i<op.inputs;i++) args.unshift(popInt());
						const value=internal.checkedInt(op.fn(...args.map(v=>v.v))),constant=args.every(v=>v.constant);
						context.iStack.push({v:value,constant,code:constant?String(value):intExpression(op.glsl,args.map(v=>v.code))});continue;
					}
					if(own(definitions,token)){
						flush();
						context.header=false;
						const args=[];
						for(let i=0;i<definitions[token].signature.intInputs;i++) args.unshift(popInt());
						if(args.some(v=>!v.constant)) fail(context,'integer arguments require compile-time specialization.');
						const child=compile(token,args.map(v=>v.v));context.children.add(child);
						context.peak=Math.max(context.peak,context.height-child.inputs+child.peak);
						adjust(-child.inputs);adjust(child.outputs);context.ops+=child.ops;context.estimatedFlops+=child.estimatedFlops;
						for(const value of child.intResults) context.iStack.push({v:value,code:String(value),constant:true});
						put(child.functionName+'(s);');continue;
					}
					if((match=/^J_([A-Za-z_$][A-Za-z0-9_$]*)_M$/.exec(token))){
						context.header=false;const value=local(match[1],false),index=popInt();
						adjust(1);context.estimatedFlops++;const code=at(value,index,true);pushFloat(code,[code]);continue;
					}
					if((match=/^JW_([A-Za-z_$][A-Za-z0-9_$]*)_$/.exec(token))){
						context.header=false;const value=local(match[1],true),index=popInt(),code=at(value,index,false);
						adjust(-1);value.init.add(index.v);writeFloat(code);continue;
					}
					if(token.startsWith('C')){
						const text=token.slice(1);
						if(/^[+-]?\d+$/.test(text)){const v=internal.checkedInt(Number(text));context.iStack.push({v,code:String(v),constant:true});}
						else{if(!scope.has(text)) fail(context,'unknown integer '+text+'.');context.iStack.push(scope.get(text));}
						continue;
					}
					if((match=/^([A-Za-z_$][A-Za-z0-9_$]*?)(J+)$/.exec(token))){
						if(match[2].length!==1) fail(context,'an integer name binds exactly one value.');
						checkName(match[1]);
						if(scope.has(match[1])||context.locals.has(match[1])||context.declarations.includes(match[1])) fail(context,'duplicate or immutable name '+match[1]+'.');
						scope.set(match[1],popInt());continue;
					}
					if((match=/^([A-Za-z_$][A-Za-z0-9_$]*?)(W+|L+)$/.exec(token))){
						if(!context.header||depth) fail(context,'parameter/local declarations must precede executable float code.');
						const name=match[1],kind=match[2];
						checkName(name);
						if(context.locals.has(name)||scope.has(name)) fail(context,'duplicate name '+name+'.');
						let width=kind.length;
						if(context.iStack.length){
							if(width!==1) fail(context,'use grouped markers or an integer array size, not both.');
							const extent=popInt();if(!extent.constant) fail(context,'array size must be compile-time constant.');width=extent.v;
						}
						if(width<0||width>Stak.limits.maxArrayFloats||width>maxSourceChars/8) fail(context,'array size exceeds scalar-code compilation budget.');
						const value={name,width,parameter:kind[0]==='W',codes:[],init:new Set()};
						for(let i=0;i<width;i++){
							const code=width===1?name:name+'_'+i;
							if(context.codeNames.has(code)||scope.has(code)) fail(context,'generated name collision for '+code+'; array components use name_0, name_1, etc.');
							context.codeNames.add(code);value.codes.push(code);
						}
						context.locals.set(name,value);context.declarations.push(...value.codes);
						if(value.parameter){
							adjust(-width);
							for(let i=width-1;i>=0;i--){value.init.add(i);writeFloat(value.codes[i]);}
						}
						continue;
					}
					if((match=/^([A-Za-z_$][A-Za-z0-9_$]*?)(V+)$/.exec(token))){
						context.header=false;const value=local(match[1],true);
						if(value.width!==match[2].length) fail(context,'local write width mismatch for '+value.name+'.');
						for(let i=value.width-1;i>=0;i--){adjust(-1);value.init.add(i);writeFloat(value.codes[i]);}
						continue;
					}
					if(token.startsWith('M')||token.startsWith('A')){
						context.header=false;const letter=token[0],text=token.slice(1);
						if(letter==='M'&&floatLiteral.test(text)){adjust(1);context.estimatedFlops++;pushFloat(numberText(Number(text)));continue;}
						const candidates=[];
						for(let width=1;width<token.length&&token[width-1]===letter;width++){
							const value=context.locals.get(token.slice(width));
							if(value&&value.width===width&&value.parameter===(letter==='M')) candidates.push(value);
						}
						if(candidates.length!==1) fail(context,candidates.length?'ambiguous grouped read '+token+'.':'unknown variable or read width mismatch: '+token+'.');
						const value=candidates[0];
						for(let i=0;i<value.width;i++){adjust(1);context.estimatedFlops++;const code=at(value,{v:i,constant:true},true);pushFloat(code,[code]);}
						continue;
					}
					fail(context,'unknown token '+token+'.');
				}
				flush();return lines;
			}
			try{
				const lines=walk(def.body,true,context.ints,0),required=Math.max(0,-context.min);
				const inputs=def.synthetic?required:prepared.inputs,outputs=inputs+context.height;
				if(required>inputs) fail(context,'float frame underflow: body consumes '+required+' inputs but signature allows '+inputs+'.');
				if(def.signature.floatOutputs!==null&&outputs!==def.signature.floatOutputs) fail(context,'float output arity mismatch: promised '+def.signature.floatOutputs+', left '+outputs+'.');
				if(context.iStack.length!==def.signature.intOutputs) fail(context,'integer output arity mismatch.');
				if(context.iStack.some(v=>!v.constant)) fail(context,'runtime integer outputs are not implemented.');
				const declarations=context.declarations.concat(scratch.slice(0,context.usedScratch));
				const js='var '+functionName+' = s=>{\n'+(declarations.length?'\tlet '+declarations.join(',')+';\n':'')+lines.join('\n')+'\n};';
				if(js.length>maxSourceChars) fail(context,'generated JS exceeds maxSourceChars='+maxSourceChars+'.');
				const weights=[1];let streamCalls=0;
				for(const line of lines){
					const count=/^\s*for\(let [\w$]+=0;[\w$]+<(\d+);/.exec(line);
					if(count){weights.push(weights.at(-1)*Number(count[1]));continue;}
					if(line.trim()==='}'){weights.pop();continue;}
					streamCalls+=weights.at(-1)*(line.match(/\bs\(/g)||[]).length;
					for(const child of context.children) if(line.trim()===child.functionName+'(s);') streamCalls+=weights.at(-1)*child.streamCalls;
				}
				const result={name,functionName,source:js,inputs,outputs,peak:inputs+context.peak,intResults:context.iStack.map(v=>v.v),children:context.children,ops:context.ops,estimatedFlops:context.estimatedFlops,streamCalls,loops:context.loops,unrolledIterations:context.unrolledIterations,localFloats:context.declarations.length,codeNames:context.codeNames};
				variants.set(key,result);return result;
			}finally{active.delete(name);}
		}
		function get(name=ast.defaultEntry,intArgs=[]){
			if(!Array.isArray(intArgs)) throw new Error('Stak JS: integer specializations must be an array.');
			const args=intArgs.map(internal.checkedInt),key=JSON.stringify([name,args]);
			if(entries.has(key)) return entries.get(key);
			const root=compile(name,args),order=[],seen=new Set();
			const visit=item=>{if(seen.has(item)) return;seen.add(item);for(const child of item.children) visit(child);order.push(item);};
			visit(root);
			const generatedNames=new Set(order.map(item=>item.functionName));
			for(const item of order) for(const variable of item.codeNames) if(generatedNames.has(variable)) throw new Error('Stak JS '+item.name+': reserved generated function name '+variable+'.');
			const jsSource=order.map(item=>item.source).join('\n\n');
			if(jsSource.length>maxSourceChars) throw new Error('Stak JS: transitive generated source exceeds maxSourceChars='+maxSourceChars+'.');
			const factory=new Function('"use strict";\n'+jsSource+'\nreturn ['+order.map(item=>item.functionName).join(',')+'];');
			const functions=factory();
			const entry=functions[functions.length-1];
			for(let i=0;i<functions.length;i++){
				functions[i].signature={...definitions[order[i].name].signature,floatInputs:order[i].inputs,floatOutputs:order[i].outputs};
				functions[i].entryName=order[i].name;
			}
			entry.ast=ast;entry.names=names.slice();entry.get=get;entry.source=source;entry.integerArgs=args.slice();entry.intOutputs=root.intResults.slice();
			entry.jsSource=jsSource;entry.generatedFunctions=functions;entry.stats={inline,estimatedFlops:root.estimatedFlops,streamCalls:root.streamCalls,peakStack:root.peak,localFloats:root.localFloats,functions:functions.length,analysisSteps,sourceChars:jsSource.length,primitiveCalls:root.ops,loopStatements:order.reduce((n,item)=>n+item.loops,0),unrolledIterations:order.reduce((n,item)=>n+item.unrolledIterations,0)};
			if(name==='@topLevel') delete entry.entryName;
			entries.set(key,entry);return entry;
		}
		const defaultName=options.entry||(ast.topLevel.length?'@topLevel':ast.defaultEntry);
		let entry;
		if(defaultName&&(options.intArgs||definitions[defaultName]?.signature.intInputs===0)) entry=get(defaultName,options.intArgs||[]);
		else{
			const problem=defaultName?new Error('Stak: entry '+defaultName+' needs integer specialization; use program.get(name,[integers])'):null;
			entry=problem?function needsIntegerSpecialization(stakstream){throw problem;}:function emptyProgram(stakstream){};
			entry.ast=ast;entry.names=names.slice();entry.get=get;entry.source=source;entry.generatedFunctions=[];entry.jsSource='';
		}
		return entry;
	};
	function floatExpression(op,a){
		if(['+','-','*','/'].includes(op)) return a.join(op);
		if(op==='add3') return a.join('+');
		if(op==='neg') return '(-'+a[0]+')';
		if(op==='fract') return '('+a[0]+'-Math.floor('+a[0]+'))';
		if(op==='sigmoid') return '(1/(1+Math.exp(-'+a[0]+')))';
		if(op==='softplus') return '(Math.max(0,'+a[0]+')+Math.log1p(Math.exp(-Math.abs('+a[0]+'))))';
		const name=op==='atan2'?'atan2':op;
		if(['min','max','pow','atan2','sqrt','abs','exp','log','sin','cos','tan','asin','acos','atan','floor','ceil','trunc','sign','tanh'].includes(name)) return 'Math.'+name+'('+a.join(',')+')';
		throw new Error('Stak JS: unknown float primitive '+op);
	}
	function intExpression(op,a){
		if(op==='add1') return '('+a[0]+'+1)';
		if(op==='div') return 'Math.trunc('+a[0]+'/'+a[1]+')';
		if(op==='mod') return '(('+a[0]+'%'+a[1]+'+'+a[1]+')%'+a[1]+')';
		if(op==='min'||op==='max') return 'Math.'+op+'('+a.join(',')+')';
		const sign={add:'+',sub:'-',mul:'*'}[op];
		if(!sign) throw new Error('Stak JS: unknown integer primitive '+op);
		return '('+a.join(sign)+')';
	}
	Stak.version='0.4.0-cpu-inline-prototype';
})(globalThis.Stak);

(function(Stak){
	'use strict';
	if(!Stak) throw new Error('Load Stak.js before its GLSL extension.');
	const own=(object,key)=>Object.prototype.hasOwnProperty.call(object,key);
	const literal=value=>{
		if(!Number.isFinite(value)) throw new Error('GLSL float literals must be finite.');
		const text=String(value);
		return /[.eE]/.test(text)?text:text+'.0';
	};
	Stak.toGLSL=function(sourceOrProgram,options){
		options=options||{};
		const internal=Stak._internals;
		const ast=typeof sourceOrProgram==='string'?internal.parse(sourceOrProgram):(sourceOrProgram.ast||sourceOrProgram);
		if(!ast||!ast.definitions) throw new Error('Stak.toGLSL expects source text or a parsed Stak program.');
		const prefix=options.prefix||'stak';
		if(!/^[A-Za-z][A-Za-z0-9_]*$/.test(prefix)||prefix.startsWith('gl_')||prefix.includes('__')) throw new Error('Use a GLSL-safe prefix without gl_ or consecutive underscores.');
		const capacity=options.capacity===undefined?64:options.capacity;
		if(!Number.isSafeInteger(capacity)||capacity<1||capacity>1048576) throw new Error('GLSL stack capacity must be an integer from 1 through 1048576.');
		const maxAnalysisSteps=options.maxAnalysisSteps===undefined?5000000:options.maxAnalysisSteps;
		const variants=new Map(),order=[],active=new Set();
		let serial=0,analysisSteps=0;
		const definitions=Object.assign(Object.create(null),ast.definitions);
		let entryName=options.entry||sourceOrProgram.entryName;
		if(!entryName&&ast.topLevel&&ast.topLevel.length){
			entryName='@topLevel';
			definitions[entryName]={name:entryName,synthetic:true,signature:{floatInputs:null,floatOutputs:null,intInputs:0,intOutputs:0},body:ast.topLevel};
		}
		if(!entryName) entryName=ast.defaultEntry;
		if(!entryName||!own(definitions,entryName)) throw new Error('Select a defined Stak entry function.');
		const fail=(context,message)=>{throw new Error('Stak GLSL '+context.name+': '+message);};
		const checkedInt=(value,context)=>{
			if(!Number.isInteger(value)||value<-2147483648||value>2147483647) fail(context,'integer arithmetic is outside signed int32 range.');
			return value;
		};
		function compile(name,intArgs){
			const key=name+'|'+intArgs.join(',');
			if(variants.has(key)) return variants.get(key);
			const def=definitions[name];
			if(!def) throw new Error('Unknown Stak function '+name);
			if(active.has(name)) throw new Error('Recursive Stak call graph cannot compile to GLSL: '+name);
			if(def.signature.intInputs!==intArgs.length) throw new Error(name+' expects '+def.signature.intInputs+' compile-time integer arguments.');
			const prepared=internal.prepare?internal.prepare(def,intArgs,definitions):null;
			active.add(name);
			const context={name,id:serial++,height:0,min:0,peak:0,locals:new Map(),declarations:[],iStack:[],ints:new Map(),loopIds:new Map(),loops:0,ops:0,localFloats:0,calleeLocalPeak:0,depth:0,header:true};
			const floatBase=prefix+'_f'+context.id;
			context.scratch=[floatBase+'_a',floatBase+'_b',floatBase+'_c',floatBase+'_d'];
			context.iStack=intArgs.map(v=>({v:checkedInt(v,context),code:String(v),constant:true}));
			const adjust=delta=>{
				context.height+=delta;
				context.min=Math.min(context.min,context.height);
				context.peak=Math.max(context.peak,context.height);
			};
			const popInt=()=>{
				if(!context.iStack.length) fail(context,'integer stack underflow.');
				return context.iStack.pop();
			};
			const local=(name,writable)=>{
				const value=context.locals.get(name);
				if(!value) fail(context,'unknown '+(writable?'local ':'float parameter/local ')+name+'.');
				if(writable&&value.parameter) fail(context,'cannot write readonly parameter '+name+'.');
				return value;
			};
			const at=(value,index)=>value.width===1?value.code:value.code+'['+index.code+']';
			const indexCheck=(value,index,read)=>{
				if(index.v<0||index.v>=value.width) fail(context,'index '+index.v+' outside '+value.name+'['+value.width+'].');
				if(read&&!value.init.has(index.v)) fail(context,'read of uninitialized '+value.name+'['+index.v+'].');
			};
			function walk(body,emit,scope,depth){
				const lines=[];
				const put=line=>{if(emit) lines.push(line);};
				for(const token of body){
					if(++analysisSteps>maxAnalysisSteps) fail(context,'static validation exceeded maxAnalysisSteps; raise this explicit analysis budget if appropriate.');
					if(typeof token!=='string'){
						if(token.kind!=='loop') fail(context,'unknown AST node.');
						context.header=false;
						const count=popInt();
						if(!count.constant) fail(context,'loop count must resolve to a compile-time integer; runtime-sized GLSL loops are not implemented.');
						if(count.v<0) fail(context,'negative loop count.');
						if(!token.body.length||typeof token.body[0]!=='string'||!/^.+J$/.test(token.body[0])) fail(context,'Loop must start with its immutable counter binding nameJ.');
						if(!context.loopIds.has(token)) context.loopIds.set(token,floatBase+'_i'+context.loopIds.size);
						const counter=context.loopIds.get(token),intBaseline=context.iStack.slice();
						if(emit) context.loops++;
						put('for(int '+counter+'=0;'+counter+'<'+count.v+';'+counter+'++){');
						for(let i=0;i<count.v;i++){
							context.iStack.push({v:i,code:counter,constant:false});
							const nested=walk(token.body,emit&&i===0,new Map(scope),depth+1);
							if(i===0&&emit) for(const line of nested) put('\t'+line);
							if(context.iStack.length!==intBaseline.length||context.iStack.some((v,j)=>v!==intBaseline[j])) fail(context,'loop body must preserve the surrounding integer stack after consuming its counter.');
						}
						put('}');
						continue;
					}
					let match;
					if(token==='Ji2fM'){
						context.header=false;
						const value=popInt();adjust(1);
						put(prefix+'_push(float('+value.code+'));');
						continue;
					}
					if(own(internal.floatOps,token)){
						context.header=false;
						const op=internal.floatOps[token],n=op.inputs;
						if(op.outputs!==1||n>4) fail(context,'unsupported GLSL primitive shape '+token+'.');
						const args=context.scratch.slice(0,n);
						for(let i=n-1;i>=0;i--) put(args[i]+'='+prefix+'_pop();');
						adjust(-n);adjust(1);
						put(prefix+'_push('+floatExpression(op.glsl,args,context)+');');
						context.ops++;
						continue;
					}
					if(own(internal.intOps,token)){
						const op=internal.intOps[token],args=[];
						for(let i=0;i<op.inputs;i++) args.unshift(popInt());
						if(op.glsl==='div'&&args[1].v===0) fail(context,'integer division by zero.');
						if(op.glsl==='mod'&&args[1].v<=0) fail(context,'integer modulo requires a positive divisor.');
						const number=intValue(op.glsl,args.map(x=>x.v));
						checkedInt(number,context);
						const constant=args.every(x=>x.constant);
						context.iStack.push({v:number,constant,code:constant?String(number):intExpression(op.glsl,args.map(x=>x.code))});
						continue;
					}
					if(own(definitions,token)){
						context.header=false;
						const signature=definitions[token].signature,args=[];
						for(let i=0;i<signature.intInputs;i++) args.unshift(popInt());
						if(args.some(v=>!v.constant)) fail(context,'integer arguments to '+token+' must be compile-time constants for specialization; passing a loop index is not implemented.');
						const child=compile(token,args.map(v=>v.v));
						context.peak=Math.max(context.peak,context.height-child.inputs+child.peak);
						adjust(-child.inputs);adjust(child.outputs);
						context.calleeLocalPeak=Math.max(context.calleeLocalPeak,child.localPeak);
						for(const value of child.intResults) context.iStack.push({v:value,code:String(value),constant:true});
						put(child.entry+'();');
						context.ops+=child.ops;
						continue;
					}
					if((match=/^J_([A-Za-z_$][A-Za-z0-9_$]*)_M$/.exec(token))){
						context.header=false;
						const value=local(match[1],false),index=popInt();
						indexCheck(value,index,true);adjust(1);
						put(prefix+'_push('+at(value,index)+');');
						continue;
					}
					if((match=/^JW_([A-Za-z_$][A-Za-z0-9_$]*)_$/.exec(token))){
						context.header=false;
						const value=local(match[1],true),index=popInt();
						indexCheck(value,index,false);adjust(-1);value.init.add(index.v);
						put(at(value,index)+'='+prefix+'_pop();');
						continue;
					}
					if((match=/^C(.+)$/.exec(token))){
						const text=match[1];
						if(/^[+-]?\d+$/.test(text)) context.iStack.push({v:checkedInt(Number(text),context),code:String(Number(text)),constant:true});
						else{
							if(!scope.has(text)) fail(context,'unknown integer '+text+'.');
							context.iStack.push(scope.get(text));
						}
						continue;
					}
					if((match=/^([A-Za-z_$][A-Za-z0-9_$]*?)(J+)$/.exec(token))){
						if(match[2].length!==1) fail(context,'one immutable integer name binds one value.');
						if(scope.has(match[1])||context.locals.has(match[1])) fail(context,'immutable integer '+match[1]+' cannot be rebound in this scope.');
						scope.set(match[1],popInt());
						continue;
					}
					if((match=/^([A-Za-z_$][A-Za-z0-9_$]*?)(W+|L+)$/.exec(token))){
						if(!context.header||depth) fail(context,'parameter/local declarations must precede executable code.');
						const name=match[1],kind=match[2];
						if(context.locals.has(name)||scope.has(name)) fail(context,'duplicate float name '+name+'.');
						let width=kind.length;
						if(context.iStack.length){
							if(kind.length!==1) fail(context,'use either grouped markers or an integer array size, not both.');
							const extent=popInt();
							if(!extent.constant) fail(context,'array size must be compile-time constant.');
							width=extent.v;
						}
						if(width<0||width>1048576) fail(context,'invalid local/parameter width '+width+'.');
						const value={name,width,parameter:kind[0]!=='L',code:floatBase+'_v'+context.locals.size,init:new Set()};
						context.locals.set(name,value);context.localFloats+=width;
						if(width) context.declarations.push('float '+value.code+(width===1?'':'['+width+']')+';');
						if(value.parameter){
							for(let i=0;i<width;i++) value.init.add(i);
							adjust(-width);
							if(width===1) put(value.code+'='+prefix+'_pop();');
							else if(width){
								put(prefix+'_sp-='+width+';');
								put('for(int '+value.code+'_i=0;'+value.code+'_i<'+width+';'+value.code+'_i++){');
								put('\t'+value.code+'['+value.code+'_i]='+prefix+'_Stak['+prefix+'_sp+'+value.code+'_i];');
								put('}');
							}
						}
						continue;
					}
					if((match=/^([A-Za-z_$][A-Za-z0-9_$]*?)(V+)$/.exec(token))){
						context.header=false;
						const value=local(match[1],true);
						if(value.width!==match[2].length) fail(context,'write marker width does not match '+value.name+'; use indexed writes.');
						for(let i=value.width-1;i>=0;i--){
							adjust(-1);value.init.add(i);put(at(value,{code:String(i)})+'='+prefix+'_pop();');
						}
						continue;
					}
					if(token.startsWith('M')||token.startsWith('A')){
						context.header=false;
						const letter=token[0],literalText=token.slice(1);
						if(letter==='M'&&/^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(literalText)){
							adjust(1);put(prefix+'_push('+literal(Math.fround(Number(literalText)))+');');
						}else{
							const candidates=[];
							for(let width=1;width<token.length&&token[width-1]===letter;width++){
								const candidate=context.locals.get(token.slice(width));
								if(candidate&&candidate.width===width&&candidate.parameter===(letter==='M')) candidates.push(candidate);
							}
							if(candidates.length!==1) fail(context,candidates.length?'ambiguous grouped read '+token+'.':'unknown or mismatched-width '+(letter==='M'?'parameter':'local')+' read '+token+'.');
							const value=candidates[0];
							for(let i=0;i<value.width;i++){
								const index={v:i,code:String(i)};indexCheck(value,index,true);adjust(1);put(prefix+'_push('+at(value,index)+');');
							}
							}
						continue;
					}
					fail(context,'unrecognized token '+token+'.');
				}
				return lines;
			}
			const lines=walk(def.body,true,context.ints,0);
			const inferredInputs=Math.max(0,-context.min),inputs=def.signature.floatInputs===null?(prepared&&!def.synthetic?prepared.inputs:inferredInputs):def.signature.floatInputs;
			if(inferredInputs>inputs) fail(context,'function reads '+inferredInputs+' inputs but declares '+inputs+'.');
			const outputs=inputs+context.height;
			if(def.signature.floatOutputs!==null&&outputs!==def.signature.floatOutputs) fail(context,'declared '+def.signature.floatOutputs+' outputs but body leaves '+outputs+'.');
			if(context.iStack.length!==def.signature.intOutputs) fail(context,'integer result count does not match signature.');
			if(context.iStack.some(v=>!v.constant)) fail(context,'runtime integer results are not implemented.');
			const entry=prefix+'_fn'+context.id;
			const source='void '+entry+'(){\n'+context.declarations.concat('float '+context.scratch.join(',')+';').map(s=>'\t'+s).join('\n')+'\n'+lines.map(s=>'\t'+s).join('\n')+'\n}';
			const result={name,entry,inputs,outputs,peak:inputs+context.peak,localPeak:context.localFloats+4+context.calleeLocalPeak,localFloats:context.localFloats,ops:context.ops,loops:context.loops,intResults:context.iStack.map(v=>v.v),source};
			active.delete(name);variants.set(key,result);order.push(result);
			return result;
		}
		function floatExpression(op,a,context){
			if(['+','-','*','/'].includes(op)) return '('+a.join(op)+')';
			if(op==='add'||op==='add3') return '('+a.join('+')+')';
			if(op==='mul') return '('+a.join('*')+')';
			if(op==='sub') return '('+a.join('-')+')';
			if(op==='div') return '('+a.join('/')+')';
			if(op==='neg') return '(-'+a[0]+')';
			if(op==='sigmoid'||op==='softplus'||op==='tanh') return prefix+'_'+op+'('+a.join(',')+')';
			if(op==='atan2') return 'atan('+a.join(',')+')';
			if(['min','max','pow','sqrt','abs','sin','cos','tan','asin','acos','atan','exp','log','floor','ceil','trunc','sign','fract','mod'].includes(op)) return op+'('+a.join(',')+')';
			fail(context,'no GLSL primitive mapping for '+op+'.');
		}
		function intValue(op,a){
			switch(op){
				case 'add':return a[0]+a[1];case 'sub':return a[0]-a[1];case 'mul':return a[0]*a[1];
				case 'mod':return ((a[0]%a[1])+a[1])%a[1];case 'div':return Math.trunc(a[0]/a[1]);case 'add1':return a[0]+1;
				case 'min':return Math.min(...a);case 'max':return Math.max(...a);
				default:throw new Error('No GLSL integer mapping for '+op);
			}
		}
		function intExpression(op,a){
			if(op==='add1') return '('+a[0]+'+1)';
			if(op==='mod') return prefix+'_imod('+a.join(',')+')';
			if(op==='div') return prefix+'_idiv('+a.join(',')+')';
			if(op==='min'||op==='max') return op+'('+a.join(',')+')';
			const symbol={add:'+',sub:'-',mul:'*',mod:'%',div:'/'}[op];
			return '('+a.join(symbol)+')';
		}
		const root=compile(entryName,options.intArgs||sourceOrProgram.integerArgs||[]);
		if(root.peak>capacity) throw new Error('Stak GLSL needs operand capacity '+root.peak+' floats, but capacity is '+capacity+'.');
		const helpers=[
			'float '+prefix+'_Stak['+capacity+'];',
			'int '+prefix+'_sp=0;',
			'uint '+prefix+'_imag(int a){uint mask=0u-uint(a<0);return (uint(a)^mask)-mask;}',
			'int '+prefix+'_idiv(int a,int b){uint q='+prefix+'_imag(a)/'+prefix+'_imag(b);uint mask=0u-uint((a<0)!=(b<0));return int((q^mask)-mask);}',
			'int '+prefix+'_imod(int a,int b){int r=int('+prefix+'_imag(a)%uint(b));return r+int(a<0)*((b-r)%b-r);}',
			'float '+prefix+'_pop(){return '+prefix+'_Stak[--'+prefix+'_sp];}',
			'void '+prefix+'_push(float value){'+prefix+'_Stak['+prefix+'_sp++]=value;}',
			'float '+prefix+'_sigmoid(float x){float e=exp(-abs(x));return mix(e,1.0,step(0.0,x))/(1.0+e);}',
			'float '+prefix+'_softplus(float x){return max(x,0.0)+log(1.0+exp(-abs(x)));}',
			'float '+prefix+'_tanh(float x){float e=exp(-2.0*abs(x));return sign(x)*(1.0-e)/(1.0+e);}'
		].join('\n');
		return {source:helpers+'\n\n'+order.map(f=>f.source).join('\n\n'),entry:root.entry,inputs:root.inputs,outputs:root.outputs,capacity,prefix,intOutputs:root.intResults.slice(),stats:{peakStack:root.peak,localFloats:root.localFloats,peakLocalFloats:root.localPeak,functions:order.length,analysisSteps,primitiveCalls:root.ops,loopStatements:order.reduce((n,f)=>n+f.loops,0)},notes:['Set '+prefix+'_sp to inputs after filling '+prefix+'_Stak in input order, then call entry().','Bounds and initialization were checked for the compile-time integer specialization.','Stack capacity excludes generated function-local arrays. Numerical agreement is approximate across JS and GLSL.']};
	};
})(globalThis.Stak);
