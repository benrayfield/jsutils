var WWmandelbrot_demoHashM_js0 = s=>{
	let y,x,real,imag,realSquared,imagSquared,active,age,tone,shade,red,green,blue;
	y=s();
	x=s();
	real=0;
	imag=0;
	active=1;
	age=0;
	for(let step=0;step<64;step++){
		age=age+active;
		realSquared=real*real;
		imagSquared=imag*imag;
		imag=Math.min((Math.max((((real*imag)*2)+y),(-4))),4);
		real=Math.min((Math.max(((realSquared-imagSquared)+x),(-4))),4);
		active=active*(1-(Math.max((Math.sign((((real*real)+(imag*imag))-4))),0)));
	}
	tone=age*0.12;
	shade=age/(age+8);
	red=Math.floor((((((Math.cos((tone+3)))*115)+120)*shade)+8));
	green=Math.floor((((((Math.cos((tone+3.8)))*115)+120)*shade)+12));
	blue=Math.floor((((((Math.cos((tone+4.6)))*115)+120)*shade)+25));
	s(((((red*65536)+(green*256))+blue)*(1-active))+(527901*active));
};
