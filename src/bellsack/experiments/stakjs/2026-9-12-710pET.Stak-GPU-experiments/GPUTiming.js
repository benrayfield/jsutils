/* GPU elapsed time, not JavaScript submission time. No gl.finish() polling. */
var GPUTiming=(()=>{
	'use strict';
	const nextFrame=()=>new Promise(resolve=>requestAnimationFrame(resolve));
	function create(gl){
		const ext=gl.getExtension('EXT_disjoint_timer_query_webgl2');
		let pending=[],active=null;
		function begin(tag){
			if(!ext||active) return false;
			if(gl.isContextLost()) throw new Error('WebGL context lost. Reload the experiment.');
			if(gl.getParameter(ext.GPU_DISJOINT_EXT)) clear();
			if(gl.getQuery(ext.TIME_ELAPSED_EXT,gl.CURRENT_QUERY)) throw new Error('Another GPU timer query is active.');
			const query=gl.createQuery();
			gl.beginQuery(ext.TIME_ELAPSED_EXT,query);
			active={query,tag,started:performance.now()};
			return true;
		}
		function end(){
			if(!active) return;
			gl.endQuery(ext.TIME_ELAPSED_EXT);
			pending.push(active);
			active=null;
			gl.flush();
		}
		function poll(){
			if(!ext) return [];
			if(gl.isContextLost()||gl.getParameter(ext.GPU_DISJOINT_EXT)){
				const lost=pending.map(item=>({tag:item.tag,error:'GPU disjoint/context loss: sample discarded'}));
				clear();
				return lost;
			}
			const result=[],keep=[];
			for(const item of pending){
				if(gl.getQueryParameter(item.query,gl.QUERY_RESULT_AVAILABLE)){
					const ns=Number(gl.getQueryParameter(item.query,gl.QUERY_RESULT));
					result.push(Number.isFinite(ns)&&ns>0?{tag:item.tag,ms:ns/1e6}:{tag:item.tag,error:'Invalid GPU elapsed time'});
					gl.deleteQuery(item.query);
				}else if(performance.now()-item.started>15000){
					result.push({tag:item.tag,error:'GPU query timed out after 15 seconds'});
					gl.deleteQuery(item.query);
				}else keep.push(item);
			}
			pending=keep;
			return result;
		}
		function clear(){
			if(active){gl.endQuery(ext.TIME_ELAPSED_EXT);gl.deleteQuery(active.query);active=null;}
			for(const item of pending) gl.deleteQuery(item.query);
			pending=[];
		}
		async function measure(draw){
			if(!ext) throw new Error('GPU timer extension unavailable. Submission time is not a GPU FLOP/s measurement.');
			if(active||pending.length) throw new Error('Drain existing GPU timer samples before benchmarking.');
			begin('measurement');
			try{draw();}finally{end();}
			for(;;){
				await nextFrame();
				const result=poll();
				if(result.length){if(result[0].error) throw new Error(result[0].error);return result[0].ms;}
			}
		}
		return {supported:!!ext,begin,end,poll,clear,measure,get pending(){return pending.length;}};
	}
	// Four vec4 multiply-add recurrences: 4 * 4 * (one multiply + one add)
	// = 32 nominal float32 arithmetic operations / iteration / pixel.
	// All four live states influence the output. Inputs are uniforms, not constants.
	function arithmeticShader(iterations=256){
		if(!Number.isInteger(iterations)||iterations<1||iterations>4096) throw new Error('Use 1..4096 benchmark iterations.');
		return `#version 300 es
precision highp float;
precision highp int;
uniform vec4 coefficient;
uniform float seed;
out vec4 color;
void main(){
	vec4 a=vec4(fract(gl_FragCoord.x*0.013+seed)*0.1+0.1);
	vec4 b=vec4(fract(gl_FragCoord.y*0.017+seed)*0.1+0.2);
	vec4 c=vec4(0.3,0.31,0.32,0.33);
	vec4 d=vec4(0.4,0.41,0.42,0.43);
	for(int i=0;i<${iterations};i++){
		a=a*coefficient+b.yzwx;
		b=b*coefficient+c.zwxy;
		c=c*coefficient+d.wxyz;
		d=d*coefficient+a.yxwz;
	}
	color=a+b+c+d;
}`;
	}
	const median=values=>{const a=values.slice().sort((x,y)=>x-y),i=a.length>>1;return a.length%2?a[i]:(a[i-1]+a[i])/2;};
	// Test-only CPU reference; never called per rendered pixel or inside timing.
	function arithmeticExpected(x,y,iterations,coefficient,seed){
		const f=Math.fround,mul=(a,b)=>f(f(a)*f(b)),add=(a,b)=>f(f(a)+f(b));
		const init=(coordinate,scale,base)=>{const t=add(mul(coordinate,scale),seed);return add(mul(f(t-Math.floor(t)),0.1),base);};
		let a=Array(4).fill(init(x,0.013,0.1)),b=Array(4).fill(init(y,0.017,0.2));
		let c=[0.3,0.31,0.32,0.33].map(f),d=[0.4,0.41,0.42,0.43].map(f);
		for(let i=0;i<iterations;i++){
			a=a.map((v,j)=>add(mul(v,coefficient[j]),b[[1,2,3,0][j]]));
			b=b.map((v,j)=>add(mul(v,coefficient[j]),c[[2,3,0,1][j]]));
			c=c.map((v,j)=>add(mul(v,coefficient[j]),d[[3,0,1,2][j]]));
			d=d.map((v,j)=>add(mul(v,coefficient[j]),a[[1,0,3,2][j]]));
		}
		return a.map((v,j)=>add(add(add(v,b[j]),c[j]),d[j]));
	}
	return {create,arithmeticShader,arithmeticExpected,median,nextFrame};
})();
