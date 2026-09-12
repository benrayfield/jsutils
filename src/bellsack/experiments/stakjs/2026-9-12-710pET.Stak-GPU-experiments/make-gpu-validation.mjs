import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
const base=path.dirname(new URL(import.meta.url).pathname);
for(const name of ['Stak.js','FractalGPU.js','GPUTiming.js']) vm.runInThisContext(fs.readFileSync(path.join(base,name),'utf8'),{filename:name});
vm.runInThisContext(fs.readFileSync(path.join(base,'Stak-tests.js'),'utf8'),{filename:'Stak-tests.js'});
for(const kind of ['mandelbrot','mandelbulb']) FractalGPU.sources[kind]=fs.readFileSync(path.join(base,kind==='mandelbrot'?'Mandelbrot.stak.txt':'Mandelbulb.stak.txt'),'utf8');
const prelude='#version 300 es\nprecision highp float;\nprecision highp int;\n';
const cases=[];
const width=process.argv.includes('--large')?512:128,height=width*3/4;
for(const iterations of [64,256,1024]){
	const f=Math.fround,coefficient=[.0001,.0002,.0003,.0004].map(f),seed=f(.17);
	const expected=[];
	for(let x=0;x<2;x++){
		const av=f(f(f(f(f(x+.5)*f(.013))+seed)%1)*f(.1)+f(.1));
		const bv=f(f(f(f(f(.5)*f(.017))+seed)%1)*f(.1)+f(.2));
		let a=[av,av,av,av],b=[bv,bv,bv,bv],c=[.3,.31,.32,.33].map(f),d=[.4,.41,.42,.43].map(f);
		for(let i=0;i<iterations;i++){
			a=a.map((v,j)=>f(f(v*coefficient[j])+b[(j+1)%4]));
			b=b.map((v,j)=>f(f(v*coefficient[j])+c[(j+2)%4]));
			c=c.map((v,j)=>f(f(v*coefficient[j])+d[(j+3)%4]));
			d=d.map((v,j)=>f(f(v*coefficient[j])+a[[1,0,3,2][j]]));
		}
		expected.push(...a.map((v,j)=>f(f(f(v+b[j])+c[j])+d[j])));
	}
	cases.push({name:'arithmetic-throughput-recurrence-probe-'+iterations,width:2,height:1,image:false,
		source:GPUTiming.arithmeticShader(iterations),uniforms:{coefficient,seed},expected,tolerance:.0001});
}
for(const [index,test] of StakTests.gpuCases.entries()){
	const prefix='StakTest'+index;
	const compiled=Stak.toGLSL(StakTests.source,{entry:test.entry,capacity:64,prefix});
	const values=test.inputs.flat(),flat=values.length?values:[0];
	const channels=Array.from({length:4},(_,i)=>i<compiled.outputs?prefix+'_Stak['+i+']':'0.0');
	const source=prelude+'uniform float StakInputs['+flat.length+'];\nout vec4 color;\n'+compiled.source+'\nvoid main(){int sampleIndex=int(gl_FragCoord.x);'+prefix+'_sp='+compiled.inputs+';for(int i=0;i<'+compiled.inputs+';i++){'+prefix+'_Stak[i]=StakInputs[sampleIndex*'+compiled.inputs+'+i];}'+compiled.entry+'();color=vec4('+channels.join(',')+');}';
	const program=Stak.eval(StakTests.source);
	const expected=test.inputs.flatMap(row=>{
		const output=StakTests.runNamed(program,test.entry,row);
		return Array.from({length:4},(_,i)=>i<compiled.outputs?output[i]:0);
	});
	cases.push({name:'baseline-'+index+'-'+test.entry,width:test.inputs.length,height:1,image:false,
		source,uniforms:{StakInputs:{floats:flat}},expected,tolerance:test.tolerance});
}
for(const kind of ['mandelbrot','mandelbulb']){
	for(const mode of ['stack','manual']){
		const built=FractalGPU.build({kind,mode});
		cases.push({name:kind+'-'+mode,width,height,source:built.sf,
			uniforms:{resolution:[width,height],camera:[.4,.2,3.4],view:[-.65,0,3.5]}});
	}
}
const points=[[0,0,0],[0,0,1],[0,1,0],[1,0,0],[1,1,1],[0,0,2],[2,0,0],[-1,-1,-1],[.1,.2,.3],[.3,-.4,.8],[.55,.55,.55],[-.71,.02,.18],[-.93,.08,-.3],[.001,-.001,.001],[1.5,1.5,1.5]];
function literal(x){return Number.isInteger(x)?x+'.0':String(x);}
for(const mode of ['stack','manual']){
	const built=FractalGPU.build({kind:'mandelbulb',mode});
	const pointArray=points.map(v=>'vec3('+v.map(literal).join(',')+')').join(',');
	cases.push({name:'mandelbulb-'+mode+'-probes',width:points.length,height:1,image:false,
		source:prelude+built.fieldSource+'\nout vec4 color;\nvoid main(){vec3 points['+points.length+']=vec3[]('+pointArray+');float d=densityAt(points[int(gl_FragCoord.x)]);color=vec4(d,0.0,0.0,1.0);}',
		expected:points.flatMap(v=>[FractalGPU.manualBulb(...v),0,0,1]),tolerance:.0005});
}
const report={cases,compare:[['mandelbrot-stack','mandelbrot-manual'],['mandelbulb-stack','mandelbulb-manual'],['mandelbulb-stack-probes','mandelbulb-manual-probes']]};
fs.writeFileSync(path.join(base,'gpu-cases.json'),JSON.stringify(report));
console.log('Wrote '+cases.length+' GPU shader cases.');
