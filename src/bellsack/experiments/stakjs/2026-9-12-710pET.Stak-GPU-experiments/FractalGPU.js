// Standalone Stak/Lamgl experiment. This file does not modify Bellsack state.
var FractalGPU=globalThis.FractalGPU=(()=>{
	'use strict';
	const sources={mandelbrot:'',mandelbulb:''};
	const manual={
		mandelbrot:`float densityAt(vec3 p){
	float x=p.x,y=p.y,real=0.0,imag=0.0,running=1.0,age=0.0;
	for(int iteration=0;iteration<64;iteration++){
		age=age+running;
		float realSquared=real*real,imagSquared=imag*imag;
		imag=min(max(real*imag*2.0+y,-4.0),4.0);
		real=min(max(realSquared-imagSquared+x,-4.0),4.0);
		running=running*(1.0-max(sign(real*real+imag*imag-4.0),0.0));
	}
	float tone=age*0.12,shade=age/(age+8.0);
	float red=floor((cos(tone+3.0)*115.0+120.0)*shade+8.0);
	float green=floor((cos(tone+3.8)*115.0+120.0)*shade+12.0);
	float blue=floor((cos(tone+4.6)*115.0+120.0)*shade+25.0);
	return ((red*65536.0+green*256.0)+blue)*(1.0-running)+527901.0*running;
}`,
		mandelbulb:`float densityAt(vec3 p){
	vec3 z=p;
	float dr=1.0,running=1.0;
	for(int iteration=0;iteration<10;iteration++){
		float radius=length(z);
		running=running*(1.0-max(sign(radius-4.0),0.0));
		float safeRadius=min(max(radius,1e-8),4.0);
		float r2=safeRadius*safeRadius,r4=r2*r2,r7=r4*r2*safeRadius,r8=r4*r4;
		float nextDr=min(r7*8.0*dr+1.0,1e30);
		float theta=acos(clamp(z.z/safeRadius,-1.0,1.0))*8.0;
		float axisFix=(1.0-sign(abs(z.x)+abs(z.y)))*1e-20;
		float phi=atan(z.y,z.x+axisFix)*8.0,sinTheta=sin(theta);
		vec3 nextZ=vec3(r8*sinTheta*cos(phi),r8*sinTheta*sin(phi),r8*cos(theta))+p;
		z=z*(1.0-running)+nextZ*running;
		dr=dr*(1.0-running)+nextDr*running;
	}
	float radius=max(length(z),1e-8);
	return max(0.5*log(radius)*radius/dr,0.0);
}`
	};
	const uniforms=`uniform vec2 resolution;
uniform vec3 camera;
uniform vec3 view;
out vec4 color;
`;
	function bulbHost(steps){
		return `
vec3 normalAt(vec3 p,float epsilon){
	vec2 k=vec2(1.0,-1.0);
	vec3 gradient=k.xyy*densityAt(p+k.xyy*epsilon)+k.yyx*densityAt(p+k.yyx*epsilon)
		+k.yxy*densityAt(p+k.yxy*epsilon)+k.xxx*densityAt(p+k.xxx*epsilon);
	return gradient*inversesqrt(max(dot(gradient,gradient),1e-20));
}
void main(){
	vec2 uv=(2.0*gl_FragCoord.xy-resolution)/resolution.y;
	float yaw=camera.x,pitch=camera.y,distance=max(camera.z,1.85);
	vec3 origin=distance*vec3(cos(pitch)*sin(yaw),sin(pitch),cos(pitch)*cos(yaw));
	vec3 forward=normalize(-origin),right=normalize(cross(forward,vec3(0.0,1.0,0.0)));
	vec3 up=cross(right,forward),direction=normalize(forward*2.15+right*uv.x+up*uv.y);
	vec3 background=mix(vec3(0.013,0.022,0.04),vec3(0.045,0.085,0.105),clamp(uv.y*0.3+0.5,0.0,1.0));
	float b=dot(origin,direction),c=dot(origin,origin)-2.56,discriminant=b*b-c;
	vec3 rgb=background;
	if(discriminant>=0.0){
		float t=max(0.0,-b-sqrt(discriminant)),end=-b+sqrt(discriminant);
		vec3 point=origin+direction*t;
		bool hit=false;
		float epsilon=0.0005;
		for(int march=0;march<${steps};march++){
			point=origin+direction*t;
			epsilon=max(0.00035,t*0.00025);
			float d=densityAt(point);
			if(d<epsilon){hit=true;break;}
			t=t+max(d*0.75,epsilon*0.5);
			if(t>end) break;
		}
		if(hit){
			// Resolve lighting at pixel scale instead of amplifying subpixel lobes.
			vec3 normal=normalAt(point,max(epsilon*3.0,t/resolution.y*0.6));
			vec3 light=normalize(vec3(-0.6,0.85,0.8));
			float diffuse=max(dot(normal,light),0.0),rim=pow(1.0-max(dot(normal,-direction),0.0),3.0);
			float bands=0.5+0.5*sin(point.z*7.0+point.x*4.0);
			vec3 albedo=mix(vec3(0.10,0.46,0.43),vec3(0.68,0.30,0.13),bands);
			float specular=pow(max(dot(normal,normalize(light-direction)),0.0),16.0);
			rgb=albedo*(0.24+diffuse*0.80)+vec3(0.20,0.42,0.50)*rim+vec3(0.16)*specular;
			rgb=mix(rgb,background,clamp(t*0.035,0.0,0.25));
		}
	}
	color=vec4(pow(max(rgb,vec3(0.0)),vec3(0.45454545)),1.0);
}`;
	}
	const brotHost=`
void main(){
	vec2 xy=view.xy+(gl_FragCoord.xy-resolution*0.5)*(view.z/resolution.x);
	float rgbPacked=densityAt(vec3(xy,0.0));
	vec3 rgb=vec3(floor(rgbPacked/65536.0),mod(floor(rgbPacked/256.0),256.0),mod(rgbPacked,256.0))/255.0;
	color=vec4(rgb,1.0);
}`;
	function build(options={}){
		const kind=options.kind||'mandelbulb',mode=options.mode||'stack';
		if(!Object.hasOwn(manual,kind)) throw new Error('Choose mandelbrot or mandelbulb.');
		if(mode!=='stack'&&mode!=='manual') throw new Error('Choose stack or manual mode.');
		const steps=options.steps===undefined?80:options.steps;
		if(!Number.isSafeInteger(steps)||steps<8||steps>256) throw new Error('Ray-march steps must be an integer from 8 to 256.');
		let compiled=null,fieldSource=manual[kind],referenceOps=null;
		if(mode==='stack'){
			const source=options.source===undefined?sources[kind]:options.source;
			compiled=Stak.toGLSL(source,{prefix:'stak',capacity:64});
			const inputs=kind==='mandelbulb'?3:2;
			if(compiled.inputs!==inputs||compiled.outputs!==1) throw new Error(kind+' needs '+inputs+' float inputs and one output.');
			// Keep generated prefixed calls safe from a user-local named S.
			fieldSource=compiled.source+`\nvoid S(float value){stak_push(value);}
float s(){return stak_pop();}
float densityAt(vec3 p){
	stak_sp=0;
	S(p.x);
	S(p.y);
${inputs===3?'\tS(p.z);\n':''}\t${compiled.entry}();
	return s();
}`;
			referenceOps=compiled.stats.primitiveCalls;
		}
		return {kind,mode,compiled,fieldSource,referenceOps,
			sf:'#version 300 es\nprecision highp float;\nprecision highp int;\n'+uniforms+'\n'+fieldSource+'\n'+(kind==='mandelbulb'?bulbHost(steps):brotHost)};
	}
	// Independent hand-written JS field for numerical tests. No Stak compilation.
	function manualBulb(x,y,z){
		let zx=x,zy=y,zz=z,dr=1,active=1;
		for(let iteration=0;iteration<10;iteration++){
			let radius=Math.sqrt(zx*zx+zy*zy+zz*zz);
			active=active*(1-Math.max(Math.sign(radius-4),0));
			let safeRadius=Math.min(Math.max(radius,1e-8),4);
			let r2=safeRadius*safeRadius,r4=r2*r2,r7=r4*r2*safeRadius,r8=r4*r4;
			let nextDr=Math.min(r7*8*dr+1,1e30);
			let theta=Math.acos(Math.min(Math.max(zz/safeRadius,-1),1))*8;
			let axisFix=(1-Math.sign(Math.abs(zx)+Math.abs(zy)))*1e-20;
			let phi=Math.atan2(zy,zx+axisFix)*8,sinTheta=Math.sin(theta);
			let nextX=r8*sinTheta*Math.cos(phi)+x,nextY=r8*sinTheta*Math.sin(phi)+y,nextZ=r8*Math.cos(theta)+z;
			zx=zx*(1-active)+nextX*active;
			zy=zy*(1-active)+nextY*active;
			zz=zz*(1-active)+nextZ*active;
			dr=dr*(1-active)+nextDr*active;
		}
		let radius=Math.max(Math.sqrt(zx*zx+zy*zy+zz*zz),1e-8);
		return Math.max(0.5*Math.log(radius)*radius/dr,0);
	}
	return {sources,manual,manualBulb,build};
})();
