// Small real-GPU readback checks. Run before trusting the performance numbers.
var FractalChecks=globalThis.FractalChecks=(()=>{
	'use strict';
	const points={
		mandelbrot:[[0,0,0],[-1,0,0],[-0.5,0,0],[0.5,0.5,0],[1,1,0],[-2,0,0],[0.4,0.2,0],[-1.5,0.5,0]],
		mandelbulb:[[0,0,0],[0,0,0.5],[0,0,1],[0,0,-1],[1,0,0],[0,1,0],[0.9,0.2,0.1],[1.2,-0.2,0.4],[-1,0.4,0.2],[0.00000001,0,0],[0,0.00000001,0],[1.5,1,0.5]]
	};
	const packedChannels=value=>[Math.floor(value/65536),Math.floor(value/256)%256,value%256];
	function compare(kind,a,b){
		if(!Number.isFinite(a)||!Number.isFinite(b)) return {pass:false,error:Infinity,tolerance:0};
		if(kind==='mandelbrot'){
			if(a<0||a>0xffffff||b<0||b>0xffffff||!Number.isInteger(a)||!Number.isInteger(b)) return {pass:false,error:Infinity,tolerance:0};
			const ac=packedChannels(a),bc=packedChannels(b),error=Math.max(...ac.map((x,i)=>Math.abs(x-bc[i])));
			return {pass:error<=2,error,tolerance:2,units:'RGB byte levels'};
		}
		const error=Math.abs(a-b),tolerance=0.0002+Math.abs(b)*0.002;
		return {pass:a>=0&&b>=0&&error<=tolerance,error,tolerance,units:'distance'};
	}
	function run(){
		if(typeof globalThis.Lamgl!=='function') throw new Error('Load Lamgl before running GPU checks.');
		const report={backend:'Real Lamgl.Tensor.get GPU readback',passed:0,failed:0,total:0,rows:[]};
		console.group('Fractal GPU checks: CPU / stack GLSL / hand-written GLSL');
		try{
			for(const kind of ['mandelbrot','mandelbulb']){
				const source=FractalGPU.sources[kind],cpu=Stak.eval(source),s=Stak.newStakStream(64);
				const shaders={};
				for(const mode of ['stack','manual']){
					const field=FractalGPU.build({kind,mode,source}).fieldSource;
					shaders[mode]='#version 300 es\nprecision highp float;\nprecision highp int;\n'+field+'\nuniform vec3 point;\nout vec4 checkedValue;\nvoid main(){checkedValue=vec4(densityAt(point),0.0,0.0,1.0);}\n';
				}
				for(const values of points[kind]){
					const point=new Float32Array(values),row={kind,point:Array.from(point),pass:false};
					report.total++;
					try{
						s.clear();s(point[0]);s(point[1]);if(kind==='mandelbulb') s(point[2]);cpu(s);row.cpu=s();
						if(s.depth!==0) throw new Error('CPU field left unexpected operands.');
						for(const mode of ['stack','manual']){
							let result;
							try{
								result=Lamgl({sh:[1,1,4],sf:shaders[mode],point});
								if(!result?.checkedValue?.get) throw new Error('Lamgl returned no checkedValue tensor.');
								const data=result.checkedValue.get();
								if(data.length!==4||data[3]!==1) throw new Error('GPU readback shape/alpha mismatch.');
								row[mode]=data[0];
							}finally{if(result?.checkedValue) result.checkedValue.free();}
						}
						row.stackCPU=compare(kind,row.stack,row.cpu);
						row.manualCPU=compare(kind,row.manual,row.cpu);
						row.stackManual=compare(kind,row.stack,row.manual);
						row.pass=row.stackCPU.pass&&row.manualCPU.pass&&row.stackManual.pass;
						if(kind==='mandelbulb'){
							row.independentCPU=FractalGPU.manualBulb(point[0],point[1],point[2]);
							row.independentCheck=compare(kind,row.stack,row.independentCPU);
							row.pass=row.pass&&row.independentCheck.pass;
						}
						if(!row.pass) row.message='Numerical mismatch; inspect all values and tolerances before benchmarking.';
					}catch(error){row.message=String(error?.message||error);}
					if(row.pass){report.passed++;console.log('PASS',row);}else{report.failed++;console.error('FAIL',row);}
					report.rows.push(row);
				}
			}
			console.log(report.passed+'/'+report.total+' passed. These checks synchronize tiny readbacks; they are not timed benchmarks.');
			console.log('The tolerances allow floating-point/compiler differences, not arbitrary fractal equivalence. Edited sources are not used: these are bundled-example regression checks.');
		}finally{console.groupEnd();}
		return report;
	}
	return {run,compare,points};
})();
