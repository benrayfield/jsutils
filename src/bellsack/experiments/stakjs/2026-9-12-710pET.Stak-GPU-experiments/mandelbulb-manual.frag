#version 300 es
precision highp float;
precision highp int;
uniform vec2 resolution;
uniform vec3 camera;
uniform vec3 view;
out vec4 color;

float densityAt(vec3 p){
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
}

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
		for(int march=0;march<80;march++){
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
}