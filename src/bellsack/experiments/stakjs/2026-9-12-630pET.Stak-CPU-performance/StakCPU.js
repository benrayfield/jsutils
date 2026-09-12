/* CPU measurement helpers. All allocation/setup occurs outside pixel calculations. */
var StakCPU=(()=>{
	'use strict';
	const pause=()=>new Promise(resolve=>setTimeout(resolve,0));
	function meter(halfLife=1){
		const tau=halfLife/Math.LN2;
		let last=performance.now(),total=0,rate=0,pixels=0;
		function advance(now){rate*=Math.exp(-(now-last)/1000/tau);last=now;}
		return {
			add(count,cost,now=performance.now()){
				advance(now);pixels+=count;total+=count*cost;rate+=count*cost/tau;
			},
			read(now=performance.now()){
				advance(now);return {total,rate,pixels,halfLife};
			},
			reset(now=performance.now()){last=now;total=0;rate=0;pixels=0;}
		};
	}
	function createModes(source){
		const stack=Stak.eval(source),inlined=Stak.eval(source,{inline:true});
		const flops=stack.stats.estimatedFlops;
		return [
			{id:'stack',name:'Stak · stack calls',fn:stack,flops},
			{id:'inline',name:'Stak · inline arithmetic',fn:inlined,flops},
			{id:'fixed',name:'Hand-written · same fixed work',fn:MandelbrotCPU.fixed,flops},
			{id:'fast',name:'Hand-written · fastest / early exit',fn:MandelbrotCPU.fast,flops}
		];
	}
	function points(width,height,centerX,centerY,span){
		const xy=new Float32Array(width*height*2),scale=span/width;
		for(let y=0;y<height;y++)for(let x=0;x<width;x++){
			const i=(y*width+x)*2;
			xy[i]=centerX+(x+0.5-width/2)*scale;
			xy[i+1]=centerY+(height/2-y-0.5)*scale;
		}
		return xy;
	}
	function runner(fn,xy){
		const s=Stak.newStakStream(64);
		return (start,end)=>{
			let checksum=0;
			for(let i=start;i<end;i++){
				s(xy[i*2]);s(xy[i*2+1]);fn(s);
				checksum=(checksum+s())>>>0;
			}
			return checksum;
		};
	}
	async function benchmark(modes,options={}){
		const width=options.width||192,height=options.height||128;
		const xy=points(width,height,options.centerX??-0.65,options.centerY??0,options.span??3.5);
		const count=width*height,rounds=options.rounds||3,minMs=options.minMs??35,warmMs=options.warmMs??30;
		const cancelled=options.cancelled||(()=>false),progress=options.progress||(()=>{});
		const rows=modes.map(mode=>({...mode,run:runner(mode.fn,xy),samples:[],checksum:0}));
		const check=()=>{if(cancelled())throw Error('Benchmark cancelled.');};
		// Each timed slice is at most 128 pixels; scheduling and allocation are untimed.
		async function sample(row,targetMs){
			let milliseconds=0,pixels=0,index=0,yieldStart=performance.now();
			do{
				check();
				const end=Math.min(count,index+128),start=performance.now();
				const checksum=row.run(index,end);
				milliseconds+=performance.now()-start;
				row.checksum=(row.checksum+checksum)>>>0;
				pixels+=end-index;index=end===count?0:end;
				if(performance.now()-yieldStart>=12){await pause();yieldStart=performance.now();}
			}while(milliseconds<targetMs||index!==0);
			return {milliseconds,pixels,millisecondsPerFrame:milliseconds*count/pixels};
		}
		for(const row of rows){progress('Warming '+row.name);await sample(row,warmMs);await pause();}
		// Rotate order so a particular mode is not always first after a yield.
		for(let round=0;round<rounds;round++)for(let j=0;j<rows.length;j++){
			const row=rows[(j+round)%rows.length];
			progress('Round '+(round+1)+'/'+rounds+' · '+row.name);
			row.samples.push(await sample(row,minMs));await pause();
		}
		check();
		const results=rows.map(row=>{
			const sorted=row.samples.map(s=>s.millisecondsPerFrame).sort((a,b)=>a-b);
			const ms=sorted[Math.floor(sorted.length/2)];
			return {id:row.id,name:row.name,millisecondsPerFrame:ms,computeFPS:1000/ms,referenceFlopsPerSecond:row.flops*count*1000/ms,checksum:row.checksum,samples:row.samples};
		});
		const manual=results.find(row=>row.id==='fixed').millisecondsPerFrame;
		for(const row of results)row.timesManualFixed=row.millisecondsPerFrame/manual;
		// Compare actual packed colors separately from timing; relaxed rounding can differ.
		const compareCount=Math.min(512,count),streams=modes.map(()=>Stak.newStakStream(64));
		for(const row of results){row.sampledPixels=compareCount;row.packedColorDifferences=0;row.maxChannelDifference=0;}
		for(let n=0;n<compareCount;n++){
			const i=Math.floor(n*(count-1)/Math.max(1,compareCount-1)),colors=[];
			for(let k=0;k<modes.length;k++){const s=streams[k];s(xy[2*i]);s(xy[2*i+1]);modes[k].fn(s);colors.push(s());}
			const reference=colors[modes.findIndex(row=>row.id==='fixed')];
			for(let k=0;k<results.length;k++){
				if(colors[k]!==reference)results[k].packedColorDifferences++;
				for(let shift=0;shift<=16;shift+=8)results[k].maxChannelDifference=Math.max(results[k].maxChannelDifference,Math.abs(((colors[k]>>>shift)&255)-((reference>>>shift)&255)));
			}
		}
		return {width,height,centerX:options.centerX??-0.65,centerY:options.centerY??0,span:options.span??3.5,rounds,referenceFlopsPerPixel:modes[0].flops,rows:results,note:'Warmed CPU kernel throughput including the same stream I/O and checksum. Excludes code generation, canvas writes and scheduling. Fast mode performs less work; reference FLOPs are common source-work units, not hardware instructions.'};
	}
	return {meter,createModes,points,runner,benchmark};
})();
