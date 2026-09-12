// Hand-written CPU references. Compilation of Stak source is not used here.
// Both functions pop y then x and push a packed 0xRRGGBB float32 value.
// Only stream writes round to float32. All internal arithmetic uses JS numbers.
var MandelbrotCPU=globalThis.MandelbrotCPU=(()=>{
	'use strict';
	const create=(iterations=64)=>{
		if(!Number.isSafeInteger(iterations)||iterations<1||iterations>4096){
			throw new Error('MandelbrotCPU iterations must be an integer from 1 to 4096');
		}
		// Same fixed-loop calculation as the supplied Stak example, including
		// its clamp, active flag, escape age, and packed RGB palette.
		const fixed=s=>{
			let y=s(),x=s();
			let real=0,imag=0,realSquared,imagSquared,active=1,age=0;
			for(let step=0;step<iterations;step++){
				age=age+active;
				realSquared=real*real;
				imagSquared=imag*imag;
				imag=Math.min(4,Math.max(-4,real*imag*2+y));
				real=Math.min(4,Math.max(-4,realSquared-imagSquared+x));
				active=active*(1-Math.max(0,Math.sign(real*real+imag*imag-4)));
			}
			let tone=age*0.12,shade=age/(age+8);
			let red=Math.floor((Math.cos(tone+3)*115+120)*shade+8);
			let green=Math.floor((Math.cos(tone+3.8)*115+120)*shade+12);
			let blue=Math.floor((Math.cos(tone+4.6)*115+120)*shade+25);
			s((red*65536+green*256+blue)*(1-active)+527901*active);
		};
		// Fast display reference: known interior tests, reused squares, and
		// escape termination. This intentionally executes less work than fixed.
		const fast=s=>{
			let y=s(),x=s();
			let ySquared=y*y,xShift=x-0.25,q=xShift*xShift+ySquared;
			if(q*(q+xShift)<=0.25*ySquared||(x+1)*(x+1)+ySquared<=0.0625){
				s(527901);
				return;
			}
			let real=0,imag=0,realSquared=0,imagSquared=0;
			for(let age=1;age<=iterations;age++){
				imag=real*imag*2+y;
				real=realSquared-imagSquared+x;
				realSquared=real*real;
				imagSquared=imag*imag;
				if(realSquared+imagSquared>4){
					let tone=age*0.12,shade=age/(age+8);
					let red=Math.floor((Math.cos(tone+3)*115+120)*shade+8);
					let green=Math.floor((Math.cos(tone+3.8)*115+120)*shade+12);
					let blue=Math.floor((Math.cos(tone+4.6)*115+120)*shade+25);
					s(red*65536+green*256+blue);
					return;
				}
			}
			s(527901);
		};
		fixed.referenceIterations=iterations;
		fast.referenceIterations=iterations;
		return {fixed,fast,iterations};
	};
	const defaults=create();
	return {create,fixed:defaults.fixed,fast:defaults.fast};
})();
