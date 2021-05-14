
pow = function(x,y){ //FIXME its not using x and y yet, but should be something like 2 divides (of x and E) and multiply (of y) etc
	//2 exponent 53 is biggest integer that double can densely represent.
	let a = 1.1102230246251565e-16; //.5 exponent 53
	//e = ((1+a) exponent (2 exponent 53)). TODO verify.
	//TODO multiply a by y/x or something like that
	//exponent by squaring
	for(let b=0; b<53; b++){
	  //deterministic roundoff
		const c = a*2;
		const d = a*a;
		a = c+d;
	}
	a++;
  return a;
};

let derivedE = pow();
console.log("Math.E="+Math.E+" derivedE="+derivedE+" diff(is exactly 0 at least in one browser I tried firefox on win10)="+Math.abs(Math.E-derivedE));
