// Node-only host regression checks. These mocks do not validate WebGL rendering.
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const dir=path.dirname(fileURLToPath(import.meta.url));
const read=name=>fs.readFileSync(path.join(dir,name),'utf8');
const rows=[];
function test(name,fn){
	try{fn();rows.push({name,status:'PASS'});}catch(error){rows.push({name,status:'FAIL',error:String(error)});}
}
async function testAsync(name,fn){
	try{await fn();rows.push({name,status:'PASS'});}catch(error){rows.push({name,status:'FAIL',error:String(error)});}
}
function environment(supported=false){
	let clock=0,nextId=0,queryId=0,foreignQuery=null,lost=false,disjoint=false,compileFailure=null;
	const raf=new Map(),events=[],queries=[],downloads=[],logs=[],elements=new Map();
	const quiet={log(){},table(){},group(){},groupEnd(){},groupCollapsed(){},warn(){},error(...args){logs.push(args.map(String).join(' '));}};
	class Element{
		constructor(id){this.id=id;this.value='';this.textContent='';this.disabled=false;this.checked=false;this.listeners={};this.children=[];this.selectionStart=0;this.selectionEnd=0;}
		appendChild(child){this.children.push(child);child.parentNode=this;events.push(['append',this.id,child.id]);return child;}
		remove(){this.removed=true;}
		addEventListener(type,fn){this.listeners[type]=fn;}
		setPointerCapture(id){this.pointerId=id;}
		getBoundingClientRect(){return {left:0,top:0,width:512,height:384};}
		setRangeText(text,start,end){this.value=this.value.slice(0,start)+text+this.value.slice(end);this.selectionStart=this.selectionEnd=start+text.length;}
		click(){downloads.push({name:this.download,url:this.href});}
		toBlob(callback){callback(new Blob(['mock PNG'],{type:'image/png'}));}
	}
	for(const match of read('Stak-GPU-playground.html').matchAll(/\bid="([^"]+)"/g))elements.set(match[1],new Element(match[1]));
	for(const match of read('Stak-GPU-playground.html').matchAll(/<select id="([^"]+)"[^>]*>([\s\S]*?)<\/select>/g)){
		const options=[...match[2].matchAll(/<option([^>]*)>([^<]*)<\/option>/g)];
		const selected=options.find(option=>/\bselected\b/.test(option[1]))||options[0];
		elements.get(match[1]).value=/value="([^"]+)"/.exec(selected[1])?.[1]||selected[2];
	}
	const canvas=new Element('Lamgl.glCanv');
	const ext={TIME_ELAPSED_EXT:1,GPU_DISJOINT_EXT:2};
	const gl={
		CURRENT_QUERY:3,QUERY_RESULT_AVAILABLE:4,QUERY_RESULT:5,RENDERER:6,VERSION:7,
		TIMEOUT_EXPIRED:8,WAIT_FAILED:9,SYNC_GPU_COMMANDS_COMPLETE:10,CONDITION_SATISFIED:11,
		getExtension:()=>supported?ext:null,isContextLost:()=>lost,
		getParameter:key=>key===ext.GPU_DISJOINT_EXT?disjoint:key===6?'Mock GPU':'Mock WebGL2',
		getQuery:()=>foreignQuery,
		createQuery(){const q={id:++queryId,available:true,ns:2500000};queries.push(q);events.push(['createQuery',q.id]);return q;},
		beginQuery(type,q){foreignQuery=q;events.push(['beginQuery',q.id]);},
		endQuery(){events.push(['endQuery',foreignQuery?.id]);foreignQuery=null;},
		getQueryParameter:(q,key)=>key===4?q.available:q.ns,
		deleteQuery(q){q.deleted=true;events.push(['deleteQuery',q.id]);},
		flush(){events.push(['flush']);},
		fenceSync(){events.push(['fence']);return {done:true};},
		clientWaitSync:q=>q.done?11:8,
		deleteSync(){events.push(['deleteSync']);}
	};
	let tensorId=0;
	function Lamgl(args){
		const id=++tensorId;events.push(['Lamgl',id,args]);
		if(compileFailure&&args.sf.includes(compileFailure))throw Error('Mock driver shader compile failure');
		const tensor={fr:true,display(){assert.ok(this.fr,'display after free');events.push(['display',id]);},free(){assert.ok(this.fr,'double free');this.fr=false;events.push(['free',id]);},get(){
			if(args.coefficient){const iterations=Number(/i<(\d+)/.exec(args.sf)[1]);return new Float32Array([.5,1.5].flatMap(x=>Array.from(context.GPUTiming.arithmeticExpected(x,.5,iterations,args.coefficient,args.seed))));}
			return new Float32Array([1,2,3,4,5,6,7,8]);
		}};
		return {color:tensor};
	}
	Lamgl.Gl=()=>gl;Lamgl.glCanv=canvas;
	const globals={console:quiet,performance:{now:()=>clock},document:{getElementById:id=>{if(!elements.has(id))throw Error('Unknown element '+id);return elements.get(id);},createElement:tag=>new Element(tag)},Lamgl,Blob,URL:{createObjectURL:()=> 'blob:mock',revokeObjectURL(){}},setTimeout(){},requestAnimationFrame:callback=>{const id=++nextId;raf.set(id,callback);return id;},cancelAnimationFrame:id=>raf.delete(id),runCPUChecks:()=>({passed:1,failed:0}),StakTests:{runCPU:()=>({passed:1,failed:0}),runGPU:()=>({passed:1,failed:0})},FractalChecks:{run:()=>({passed:1,failed:0})}};
	for(const name of ['StakAllocationTests','StakReadabilityTests','StakPerformanceTests'])globals[name]={run:()=>({passed:1,failed:0})};
	const context=vm.createContext(globals);context.window=context;
	for(const file of ['Stak.js','FractalGPU.js','GPUTiming.js'])vm.runInContext(read(file),context,{filename:file});
	context.FractalGPU.sources.mandelbrot=read('Mandelbrot.stak.txt');
	context.FractalGPU.sources.mandelbulb=read('Mandelbulb.stak.txt');
	function tick(ms=16){clock+=ms;const callbacks=[...raf.values()];raf.clear();for(const callback of callbacks)callback(clock);}
	async function settle(promise){let done=false,error;Promise.resolve(promise).then(()=>done=true,e=>{error=e;done=true;});for(let i=0;i<100&&!done;i++){await Promise.resolve();tick();await Promise.resolve();}if(!done)throw Error('Promise did not settle in 100 manually pumped frames');if(error)throw error;}
	return {context,elements,canvas,gl,events,queries,downloads,logs,tick,settle,start(){vm.runInContext(read('viewer.js'),context,{filename:'viewer.js'});},time(value){clock=value;},disjoint(value){disjoint=value;},lost(value){lost=value;},foreign(value){foreignQuery=value;},compileFailure(value){compileFailure=value;}};
}
const ui=environment(false);ui.start();
test('Template initialization chooses 512 × 384 Mandelbulb and both sources exist',()=>{
	assert.equal(ui.elements.get('resolution').value,'512 × 384');assert.equal(ui.context.StakGPUExperiment.program.kind,'mandelbulb');
	assert.match(ui.elements.get('source').value,/WWWmandelbulb/);assert.ok(ui.context.FractalGPU.sources.mandelbrot.length>100);
});
test('The actual Lamgl canvas is appended into the viewport',()=>{assert.equal(ui.canvas.parentNode,ui.elements.get('viewport'));assert.equal(ui.elements.get('boot').removed,true);});
test('Missing GPU timer disables comparison and GFLOP/s without disabling rendering',()=>{
	assert.equal(ui.elements.get('compare').disabled,true);assert.equal(ui.elements.get('flops').disabled,true);assert.equal(ui.elements.get('gpuMs').textContent,'unavailable');
	ui.tick();const draw=ui.events.filter(e=>e[0]==='Lamgl').at(-1);assert.equal(draw[2].sh.join(','),'384,512,4');
});
test('Each displayed tensor is freed after display and compile probes are freed',()=>{
	for(const display of ui.events.filter(e=>e[0]==='display'))assert.ok(ui.events.findIndex(e=>e[0]==='free'&&e[1]===display[1])>ui.events.indexOf(display));
	const probe=ui.events.find(e=>e[0]==='Lamgl');assert.equal(probe[2].sh.join(','),'1,1,4');assert.ok(ui.events.some(e=>e[0]==='free'&&e[1]===probe[1]));
});
test('Mandelbrot/Mandelbulb switching loads matching source and kernel',()=>{
	ui.elements.get('kind').value='mandelbrot';ui.elements.get('kind').onchange();assert.equal(ui.context.StakGPUExperiment.program.kind,'mandelbrot');assert.match(ui.elements.get('source').value,/WWmandelbrot/);
	ui.tick();assert.equal(ui.events.filter(e=>e[0]==='Lamgl').at(-1)[2].view[2],3.5);
	ui.elements.get('kind').value='mandelbulb';ui.elements.get('kind').onchange();assert.equal(ui.context.StakGPUExperiment.program.kind,'mandelbulb');
});
test('Pointer drag changes the Mandelbulb camera and release stops dragging',()=>{
	ui.tick();const before=ui.events.filter(e=>e[0]==='Lamgl').at(-1)[2].camera[0],v=ui.elements.get('viewport');
	v.onpointerdown({clientX:10,clientY:10,pointerId:1});v.onpointermove({clientX:50,clientY:20});ui.tick();
	const after=ui.events.filter(e=>e[0]==='Lamgl').at(-1)[2].camera[0];assert.notEqual(before,after);v.onpointerup();
	const count=ui.events.filter(e=>e[0]==='Lamgl').length;v.onpointermove({clientX:80,clientY:30});ui.tick();assert.equal(ui.events.filter(e=>e[0]==='Lamgl').length,count);
});
test('Mandelbrot wheel zoom keeps the pointed coordinate fixed',()=>{
	ui.elements.get('kind').value='mandelbrot';ui.elements.get('kind').onchange();ui.tick();
	const before=ui.events.filter(e=>e[0]==='Lamgl').at(-1)[2].view;let prevented=false;
	ui.elements.get('viewport').listeners.wheel({clientX:384,clientY:96,deltaY:-100,preventDefault(){prevented=true;}});ui.tick();
	const after=ui.events.filter(e=>e[0]==='Lamgl').at(-1)[2].view;assert.ok(prevented);assert.ok(after[2]<before[2]);
	assert.ok(Math.abs(before[0]+.25*before[2]-after[0]-.25*after[2])<1e-6);
	assert.ok(Math.abs(before[1]+.1875*before[2]-after[1]-.1875*after[2])<1e-6);
});
test('Apply uses normalized edited source and handwritten mode ignores edits',()=>{
	ui.elements.get('source').value='WWcustomMBlok\r\n\tyW xW\r\n\tM12345\rKolb';ui.elements.get('apply').onclick();
	assert.equal(ui.context.StakGPUExperiment.program.mode,'stack');assert.match(ui.context.StakGPUExperiment.program.fieldSource,/12345/);
	ui.elements.get('mode').value='manual';ui.elements.get('mode').onchange();assert.equal(ui.context.StakGPUExperiment.program.fieldSource,ui.context.FractalGPU.manual.mandelbrot);
});
test('Rejected apply is transactional: current program and selected mode stay coherent',()=>{
	const before=ui.context.StakGPUExperiment.program;ui.elements.get('source').value='INVALID_SOURCE';ui.elements.get('apply').onclick();
	assert.equal(ui.context.StakGPUExperiment.program,before);assert.equal(ui.elements.get('mode').value,before.mode);assert.ok(ui.elements.get('error').textContent.length>0);
});
test('A failed edit does not poison the saved source when switching away and back',()=>{
	ui.elements.get('kind').value='mandelbulb';ui.elements.get('kind').onchange();
	ui.elements.get('kind').value='mandelbrot';ui.elements.get('kind').onchange();
	assert.notEqual(ui.elements.get('source').value,'INVALID_SOURCE');assert.equal(ui.context.StakGPUExperiment.program.kind,'mandelbrot');
});
test('Driver shader compilation failure also preserves the active program',()=>{
	const before=ui.context.StakGPUExperiment.program;ui.compileFailure('23456');
	ui.elements.get('source').value='WWdriverFailureMBlok yW xW M23456 Kolb';ui.elements.get('apply').onclick();
	assert.equal(ui.context.StakGPUExperiment.program,before);assert.match(ui.elements.get('error').textContent,/driver shader compile/);ui.compileFailure(null);
});
test('Source/report/PNG actions trigger downloads and textarea accepts Tab',()=>{
	ui.elements.get('restore').onclick();ui.elements.get('saveSource').onclick();ui.elements.get('exportReport').onclick();ui.elements.get('saveImage').onclick();
	assert.deepEqual(ui.downloads.slice(-3).map(x=>x.name),['mandelbrot.stak.txt','Stak-GPU-results.json','Stak-mandelbrot.png']);
	const box=ui.elements.get('source');box.value='ab';box.selectionStart=box.selectionEnd=1;let prevented=false;
	box.onkeydown({key:'Tab',target:box,preventDefault(){prevented=true;}});assert.ok(prevented);assert.equal(box.value,'a\tb');
});
await testAsync('CPU check task restores controls and timer-disabled controls remain disabled',async()=>{
	await ui.settle(ui.elements.get('cpuTests').onclick());assert.equal(ui.context.StakGPUExperiment.reports.tests.at(-1).type,'cpu');assert.equal(ui.elements.get('apply').disabled,false);assert.equal(ui.elements.get('compare').disabled,true);assert.equal(ui.elements.get('flops').disabled,true);
});
test('Context loss cancels animation and displays recovery instruction',()=>{ui.canvas.listeners.webglcontextlost();assert.match(ui.elements.get('error').textContent,/context lost/i);});
const t=environment(true),timer=t.context.GPUTiming.create(t.gl);
test('GPU timer starts/ends query, converts nanoseconds, and deletes completed query',()=>{assert.equal(timer.begin('tag'),true);assert.equal(timer.begin('second'),false);timer.end();assert.equal(timer.pending,1);const result=timer.poll();assert.equal(result[0].tag,'tag');assert.equal(result[0].ms,2.5);assert.equal(timer.pending,0);assert.equal(t.queries.at(-1).deleted,true);});
test('An incomplete timer query remains pending until available',()=>{timer.begin('later');const q=t.queries.at(-1);q.available=false;timer.end();assert.equal(timer.poll().length,0);assert.equal(timer.pending,1);q.available=true;assert.equal(timer.poll()[0].tag,'later');});
test('Disjoint GPU samples are discarded, never interpreted as throughput',()=>{timer.begin('disjoint');timer.end();t.disjoint(true);const result=timer.poll();assert.match(result[0].error,/disjoint/);assert.equal(timer.pending,0);t.disjoint(false);});
test('Queries time out after 15 seconds and are deleted',()=>{timer.begin('timeout');const q=t.queries.at(-1);q.available=false;timer.end();t.time(15001);assert.match(timer.poll()[0].error,/timed out/);assert.equal(q.deleted,true);});
test('Nonpositive GPU elapsed values are rejected',()=>{timer.begin('zero');t.queries.at(-1).ns=0;timer.end();assert.match(timer.poll()[0].error,/Invalid/);});
test('Another active GPU query cannot be silently nested',()=>{t.foreign({id:999});assert.throws(()=>timer.begin('nested'),/Another GPU timer/);t.foreign(null);});
test('Clearing an active timer ends and deletes it',()=>{timer.begin('clear');const q=t.queries.at(-1);timer.clear();assert.equal(q.deleted,true);assert.equal(timer.pending,0);});
await testAsync('Asynchronous GPU measurement waits for result rather than timing submission',async()=>{let result,drawn=0;const promise=timer.measure(()=>{drawn++;}).then(ms=>{result=ms;});await t.settle(promise);assert.equal(drawn,1);assert.equal(result,2.5);});
await testAsync('Missing timer extension refuses fake submission-time GFLOP/s',async()=>{const no=ui.context.GPUTiming.create(ui.gl);assert.equal(no.begin(),false);assert.equal(no.poll().length,0);await assert.rejects(no.measure(()=>{}),/unavailable/);});
test('Benchmark iteration bounds and nominal operation structure remain fixed',()=>{assert.throws(()=>t.context.GPUTiming.arithmeticShader(0));assert.throws(()=>t.context.GPUTiming.arithmeticShader(4097));const source=t.context.GPUTiming.arithmeticShader(64);assert.match(source,/i<64/);assert.equal((source.match(/=\w\*coefficient\+/g)||[]).length,4);});
const timedUI=environment(true);timedUI.start();
await testAsync('Fractal timing action completes rotated samples and publishes stack/manual ratio',async()=>{
	await timedUI.settle(timedUI.elements.get('compare').onclick());const report=timedUI.context.StakGPUExperiment.reports.measurements.at(-1);
	assert.equal(report.type,'default-fractal-gpu');assert.equal(report.stackTimesSlower,1);assert.equal(report.rows[0].gpuMilliseconds.length,5);assert.equal(report.width,512);assert.equal(report.height,384);
});
await testAsync('Arithmetic benchmark action uses GPU milliseconds and explicit nominal work',async()=>{
	await timedUI.settle(timedUI.elements.get('flops').onclick());const report=timedUI.context.StakGPUExperiment.reports.measurements.at(-1);
	assert.equal(report.type,'nominal-float32-multiply-add-throughput');assert.equal(report.operations,512*384*256*32);assert.equal(report.medianMilliseconds,2.5);assert.equal(report.estimatedGflops,report.operations/(2.5*1e6));
});
await testAsync('Cancellation between submissions restores controls without another workload',async()=>{
	const before=timedUI.context.StakGPUExperiment.reports.measurements.length;
	const promise=timedUI.elements.get('compare').onclick();timedUI.elements.get('cancel').onclick();await timedUI.settle(promise);
	assert.equal(timedUI.context.StakGPUExperiment.reports.measurements.length,before);assert.match(timedUI.elements.get('report').textContent,/Cancelled/);assert.equal(timedUI.elements.get('apply').disabled,false);
});
await testAsync('GPU correctness button invokes both primitive and fractal check suites',async()=>{
	await timedUI.settle(timedUI.elements.get('gpuTests').onclick());const tests=timedUI.context.StakGPUExperiment.reports.tests;
	assert.equal(tests.at(-2).type,'gpu-primitives');assert.equal(tests.at(-1).type,'gpu-fractals');
});
const report={kind:'Mock DOM/Lamgl host checks, not actual browser/GPU execution',passed:rows.filter(x=>x.status==='PASS').length,failed:rows.filter(x=>x.status==='FAIL').length,rows};
fs.writeFileSync(path.join(dir,'gpu-host-validation.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
if(rows.some(x=>x.status==='FAIL'))process.exitCode=1;
