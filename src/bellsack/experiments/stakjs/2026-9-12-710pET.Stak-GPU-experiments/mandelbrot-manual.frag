#version 300 es
precision highp float;
precision highp int;
uniform vec2 resolution;
uniform vec3 camera;
uniform vec3 view;
out vec4 color;

float densityAt(vec3 p){
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
}

void main(){
	vec2 xy=view.xy+(gl_FragCoord.xy-resolution*0.5)*(view.z/resolution.x);
	float rgbPacked=densityAt(vec3(xy,0.0));
	vec3 rgb=vec3(floor(rgbPacked/65536.0),mod(floor(rgbPacked/256.0),256.0),mod(rgbPacked,256.0))/255.0;
	color=vec4(rgb,1.0);
}