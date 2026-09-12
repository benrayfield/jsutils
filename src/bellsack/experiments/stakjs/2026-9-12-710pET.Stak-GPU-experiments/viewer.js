/* Host UI only. No pixel readback in the normal rendering loop. */
(()=>{
	'use strict';
	const $=id=>document.getElementById(id),saved={...FractalGPU.sources},programs=new Map();
	let gl,timer,canvas,fence=null,current=null,busy=false,cancelled=false,dirty=true;
	let yaw=0.65,pitch=0.25,distance=3.3,cx=-0.65,cy=0,span=3.5,drag=null;
	let lastFrame=performance.now(),rate=0,requestId=0,version=0;
	const reports={created:new Date().toISOString(),measurements:[],tests:[]};
	function runCPUChecks(){
		const suites=[StakTests.runCPU(),StakAllocationTests.run(),StakReadabilityTests.run(),StakPerformanceTests.run()];
		return {suites,passed:suites.reduce((n,s)=>n+s.passed,0),failed:suites.reduce((n,s)=>n+s.failed,0)};
	}
	const settings=()=>({kind:$('kind').value,mode:$('mode').value,width:Number($('resolution').value.split(' × ')[0]),height:Number($('resolution').value.split(' × ')[1])});
	function uniforms(config=settings()){
		return {resolution:new Float32Array([config.width,config.height]),camera:new Float32Array([yaw,pitch,distance]),view:new Float32Array([cx,cy,span])};
	}
	const free=tensor=>{if(tensor&&tensor.fr) tensor.free();};
	function run(built,config=settings(),args=uniforms(config)){
		return Lamgl({sh:[config.height,config.width,4],sf:built.sf,...args}).color;
	}
	function load(kind,mode,source){
		const key=kind+'|'+mode+'|'+source;
		if(!programs.has(key)){
			const built=FractalGPU.build({kind,mode,source,steps:80});
			// Compile + execute a tiny test before replacing the visible program.
			let test;
			try{test=run(built,{width:1,height:1});}finally{free(test);}
			programs.set(key,built);
		}
		return programs.get(key);
	}
	function inspect(){
		$('glsl').textContent=current.sf;
		try{
			const js=Stak.eval(saved[$('kind').value],{inline:true});
			$('js').textContent=js.jsSource;
			$('sourceStats').textContent=`Source reference work: ${js.stats.estimatedFlops.toLocaleString()} operations per field call (includes float loads). Not hardware FLOPs. Stack peak: ${js.stats.peakStack} floats.`;
		}catch(error){$('js').textContent=String(error);}
		const bulb=$('kind').value==='mandelbulb';
		$('sourceLabel').textContent=bulb?'Caller pushes x, y, z. Field returns a distance estimate; shared GLSL camera/ray marcher supplies pixels.':'Caller pushes real, imaginary. Field returns packed RGB (0…0xffffff).';
		$('viewLabel').textContent=(bulb?'MANDELBULB':'MANDELBROT')+' · '+($('mode').value==='stack'?'STAK STACK':'HANDWRITTEN · bundled field');
		$('usage').textContent=`const tensor = Lamgl({
	sh: [384, 512, 4],
	sf: shaderString, // complete shader shown above
	resolution: new Float32Array([512, 384]),
	camera: new Float32Array([0.65, 0.25, 3.3]),
	view: new Float32Array([-0.65, 0, 3.5])
}).color;
document.getElementById('viewport').appendChild(Lamgl.glCanv);
tensor.display();
tensor.free(); // display has submitted its read; return texture to Lamgl's pool`;
	}
	function activate(){
		try{
			const next=load($('kind').value,$('mode').value,saved[$('kind').value]);
			current=next;version++;dirty=true;inspect();$('error').textContent='';
		}catch(error){
			if(current){$('kind').value=current.kind;$('mode').value=current.mode;$('source').value=saved[current.kind];}
			$('error').textContent=String(error);console.error(error);
		}
	}
	function download(name,text,type='text/plain'){
		const blob=new Blob([text],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');
		a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
	}
	function reset(){yaw=0.65;pitch=0.25;distance=3.3;cx=-0.65;cy=0;span=3.5;dirty=true;}
	function waitForFrame(){
		if(!fence) return true;
		const result=gl.clientWaitSync(fence,0,0);
		if(result===gl.TIMEOUT_EXPIRED) return false;
		gl.deleteSync(fence);fence=null;
		if(result===gl.WAIT_FAILED) throw new Error('GPU completion fence failed. Reload after context loss.');
		return true;
	}
	function frame(now){
		requestId=requestAnimationFrame(frame);
		const dt=Math.min(1,(now-lastFrame)/1000);lastFrame=now;rate*=Math.exp(-Math.LN2*dt);
		$('fps').textContent=rate.toFixed(1);
		if(!gl||busy) return;
		try{
			for(const sample of timer.poll()){
				if(sample.error) $('gpuMs').textContent='discarded';
				else if(sample.tag===version) $('gpuMs').textContent=sample.ms.toFixed(2)+' ms';
			}
			if(!waitForFrame()||timer.pending||!current) return;
			if($('animate').checked){if($('kind').value==='mandelbulb') yaw+=dt*0.16;dirty=true;}
			if(!dirty) return;
			dirty=false;
			let tensor;
			const start=performance.now(),measured=timer.begin(version);
			try{tensor=run(current);}finally{if(measured) timer.end();}
			$('submitMs').textContent=(performance.now()-start).toFixed(2)+' ms';
			try{tensor.display();}finally{free(tensor);}
			fence=gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE,0);gl.flush();
			rate+=Math.LN2;
		}catch(error){$('error').textContent=String(error);$('animate').checked=false;console.error(error);}
	}
	async function exclusive(task){
		if(busy) return;
		if(!gl||!timer){$('report').textContent='GPU is unavailable. Check the startup error above.';return;}
		busy=true;cancelled=false;$('cancel').disabled=false;
		for(const id of ['compare','flops','gpuTests','cpuTests','apply','restore','kind','mode','resolution','iterations']) $(id).disabled=true;
		try{
			const until=performance.now()+15000;
			while(!waitForFrame()||timer.pending){
				checkCancel();timer.poll();if(performance.now()>until) throw new Error('Timed out waiting for current GPU frame.');
				await GPUTiming.nextFrame();
			}
			await task();
		}catch(error){$('report').textContent+='\n'+String(error);console.error(error);}
		finally{
			busy=false;$('cancel').disabled=true;
			for(const id of ['compare','flops','gpuTests','cpuTests','apply','restore','kind','mode','resolution','iterations']) $(id).disabled=false;
			$('compare').disabled=$('flops').disabled=!timer.supported;
			dirty=true;
		}
	}
	function checkCancel(){if(cancelled) throw new Error('Cancelled between GPU submissions. An already-running shader cannot be interrupted.');}
	$('compare').onclick=()=>exclusive(async()=>{
		const config=settings(),args=uniforms(config),rows=['stack','manual'].map(mode=>({mode,built:load(config.kind,mode,FractalGPU.sources[config.kind]),times:[]}));
		$('report').textContent='Warming both bundled kernels; edited source is not used for this comparison…';
		for(let i=0;i<3;i++) for(const row of rows){checkCancel();await timer.measure(()=>{const t=run(row.built,config,args);free(t);});}
		for(let round=0;round<5;round++){
			for(let j=0;j<2;j++){
				checkCancel();const row=rows[(round+j)%2];
				row.times.push(await timer.measure(()=>{const t=run(row.built,config,args);free(t);}));
			}
			$('report').textContent=`Benchmarking default ${config.kind}: ${round+1}/5 rotated rounds…`;
		}
		const medians=rows.map(row=>GPUTiming.median(row.times)),ratio=medians[0]/medians[1];
		const report={type:'default-fractal-gpu',kind:config.kind,width:config.width,height:config.height,uniforms:Object.fromEntries(Object.entries(args).map(([k,v])=>[k,Array.from(v)])),rows:rows.map((row,i)=>({mode:row.mode,gpuMilliseconds:row.times,medianMilliseconds:medians[i]})),stackTimesSlower:ratio};
		reports.measurements.push(report);console.table(report.rows);
		$('report').textContent=`Default ${config.kind} · ${config.width} × ${config.height}\nMedian of 5 GPU samples, 3 warmups each; display/readback excluded.\n\nStak stack:  ${medians[0].toFixed(3)} ms\nHandwritten: ${medians[1].toFixed(3)} ms\nStack / handwritten: ${ratio.toFixed(2)}× time\n\nSame field and ray marcher; GPU floating-point differences can change ray counts. This is whole-shader time, not isolated instruction cost. Raw samples are in the console and saved report.`;
	});
	$('flops').onclick=()=>exclusive(async()=>{
		const config=settings(),iterations=Number($('iterations').value),sf=GPUTiming.arithmeticShader(iterations);
		const args={coefficient:new Float32Array([0.0001,0.0002,0.0003,0.0004]),seed:0.17};
		const draw=()=>{const t=Lamgl({sh:[config.height,config.width,4],sf,...args}).color;free(t);};
		$('report').textContent='Warming a separate fixed multiply/add workload…';
		draw();for(let i=0;i<3;i++){checkCancel();await timer.measure(draw);}
		const times=[];
		for(let i=0;i<5;i++){checkCancel();times.push(await timer.measure(draw));$('report').textContent=`Arithmetic GPU sample ${i+1}/5…`;}
		const ms=GPUTiming.median(times),ops=config.width*config.height*iterations*32,gflops=ops/(ms*1e6);
		// Read only one tiny independently-computed output after timing, not the measured image.
		const t=Lamgl({sh:[1,2,4],sf,...args}).color;let values;
		try{values=Array.from(t.get());}finally{free(t);}
		const expected=[...GPUTiming.arithmeticExpected(0.5,0.5,iterations,args.coefficient,args.seed),...GPUTiming.arithmeticExpected(1.5,0.5,iterations,args.coefficient,args.seed)];
		if(!values.every((value,i)=>Number.isFinite(value)&&Math.abs(value-expected[i])<=0.0001+Math.abs(expected[i])*0.001)) throw new Error('Arithmetic benchmark failed its independent float32 CPU recurrence check.');
		const report={type:'nominal-float32-multiply-add-throughput',width:config.width,height:config.height,iterations,operationsPerIteration:32,operations:ops,gpuMilliseconds:times,medianMilliseconds:ms,estimatedGflops:gflops,outputProbe:values,shader:sf};
		reports.measurements.push(report);console.log(report);
		$('report').textContent=`Estimated arithmetic throughput: ${gflops.toFixed(2)} GFLOP/s\n${ops.toLocaleString()} nominal float32 multiply/add operations / ${(ms/1000).toFixed(6)} GPU seconds\n${config.width} × ${config.height} pixels × ${iterations} iterations × 32 operations\n\nMedian of 5 GPU samples: ${ms.toFixed(3)} ms. Multiply + add counts as 2 (whether fused or not).\nThis is not a hardware instruction count: driver optimization, scheduling and shader output overhead remain. Loads, loop overhead, setup and final output sums are excluded from the numerator.\nIt does NOT estimate Mandelbulb GFLOP/s or maximum advertised GPU performance. Inspect the exact shader in the saved report.`;
	});
	$('cancel').onclick=()=>{cancelled=true;};
	$('cpuTests').onclick=()=>exclusive(async()=>{const result=runCPUChecks();reports.tests.push({type:'cpu',result});$('report').textContent=JSON.stringify(result,null,2);});
	$('gpuTests').onclick=()=>exclusive(async()=>{
		$('report').textContent='Running tiny readback tests. Details and failures appear in the console…';
		await GPUTiming.nextFrame();
		const result=StakTests.runGPU({Lamgl});reports.tests.push({type:'gpu-primitives',result});
		const fractals=FractalChecks.run();reports.tests.push({type:'gpu-fractals',result:fractals});
		$('report').textContent=JSON.stringify({primitives:result,fractals},null,2);
	});
	$('apply').onclick=()=>{
		if(busy)return;
		const kind=$('kind').value,source=$('source').value.replace(/\r\n/g,'\n').replace(/\r/g,'\n');
		try{
			const next=load(kind,'stack',source);
			saved[kind]=source;current=next;$('mode').value='stack';version++;dirty=true;inspect();$('error').textContent='';
		}catch(error){$('error').textContent='Rejected edit; last working shader retained.\n'+String(error);console.error(error);}
	};
	$('restore').onclick=()=>{saved[$('kind').value]=FractalGPU.sources[$('kind').value];$('source').value=saved[$('kind').value];activate();};
	$('kind').onchange=()=>{$('source').value=saved[$('kind').value];reset();activate();};
	$('mode').onchange=activate;$('resolution').onchange=()=>{version++;dirty=true;};
	$('reset').onclick=reset;$('render').onclick=()=>{dirty=true;};
	$('saveSource').onclick=()=>download($('kind').value+'.stak.txt',$('source').value);
	$('exportReport').onclick=()=>download('Stak-GPU-results.json',JSON.stringify(reports,null,2),'application/json');
	$('saveImage').onclick=()=>{
		if(busy||!current)return;
		try{const t=run(current);try{t.display();}finally{free(t);}canvas.toBlob(blob=>{if(blob)download('Stak-'+$('kind').value+'.png',blob,'image/png');});}catch(error){$('error').textContent=String(error);}
	};
	$('source').onkeydown=event=>{if(event.key==='Tab'){event.preventDefault();const box=event.target;box.setRangeText('\t',box.selectionStart,box.selectionEnd,'end');}};
	const viewport=$('viewport');
	viewport.onpointerdown=event=>{if(busy)return;drag={x:event.clientX,y:event.clientY};viewport.setPointerCapture(event.pointerId);};
	viewport.onpointerup=viewport.onpointercancel=()=>{drag=null;};
	viewport.onpointermove=event=>{
		if(!drag||busy)return;
		const rect=viewport.getBoundingClientRect(),dx=event.clientX-drag.x,dy=event.clientY-drag.y;
		if($('kind').value==='mandelbulb'){yaw-=dx*0.008;pitch=Math.max(-1.4,Math.min(1.4,pitch+dy*0.008));}
		else{cx-=dx/rect.width*span;cy+=dy/rect.width*span;}
		drag={x:event.clientX,y:event.clientY};dirty=true;
	};
	viewport.addEventListener('wheel',event=>{
		event.preventDefault();if(busy)return;
		const factor=Math.exp(Math.max(-1,Math.min(1,event.deltaY*0.001)));
		if($('kind').value==='mandelbulb')distance=Math.max(1.65,Math.min(12,distance*factor));
		else{
			const rect=viewport.getBoundingClientRect(),x=(event.clientX-rect.left)/rect.width-.5,y=(rect.height/2-(event.clientY-rect.top))/rect.width,newSpan=Math.max(1e-6,Math.min(10,span*factor));
			cx+=x*(span-newSpan);cy+=y*(span-newSpan);span=newSpan;
		}
		dirty=true;
	},{passive:false});
	try{
		gl=Lamgl.Gl();canvas=Lamgl.glCanv;viewport.appendChild(canvas);$('boot').remove();
		timer=GPUTiming.create(gl);reports.renderer=gl.getParameter(gl.RENDERER);reports.version=gl.getParameter(gl.VERSION);reports.gpuTimerSupported=timer.supported;
		$('status').textContent=timer.supported?'GPU timer available. Compile time is separate from subsequent warmed GPU samples.':'GPU elapsed timer unavailable in this browser. Rendering and correctness tests work; GFLOP/s and timing comparisons are disabled.';
		if(!timer.supported){$('gpuMs').textContent='unavailable';$('compare').disabled=$('flops').disabled=true;}
		$('source').value=saved.mandelbulb;activate();requestId=requestAnimationFrame(frame);
		canvas.addEventListener('webglcontextlost',()=>{cancelAnimationFrame(requestId);cancelled=true;$('error').textContent='WebGL context lost. Reload this page; reduce resolution/work if it recurs.';});
	}catch(error){
		$('error').textContent='Could not start WebGL2/Lamgl: '+String(error);console.error(error);
		for(const id of ['compare','flops','gpuTests','saveImage','render','apply','restore','kind','mode','resolution']) $(id).disabled=true;
		$('cpuTests').onclick=()=>{const result=runCPUChecks();reports.tests.push({type:'cpu',result});$('report').textContent=JSON.stringify(result,null,2);};
	}
	window.StakGPUExperiment={get program(){return current;},get reports(){return reports;},render:()=>{dirty=true;},FractalGPU};
})();
