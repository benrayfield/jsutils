"use strict"; //TODO which ways of using doubles have deterministic roundoff same in javascript, java, and opencl?


//2 exponent 53 is biggest integer that double can densely represent.
//It has 1 sign bit, 11 exponent bits, a high 1 bit not stored, and 52 fraction digit bits.
//The exponent bits are 0 for subnormals (very small numbers and 0), 11 1s for infinities and nans, else is a normal exponent.
const DigitBitsInDouble = 53;
const DigitBitsInDoubleIncludingHigh1 = 1+DigitBitsInDouble;

//x^y for any number x and integer y
const MultiplyByItselfNTimes = (x,y)=>{
	let ret = 1;
	for(let i=y; i>0; i--) ret *= x;
	return ret;
};

const TwoPowNeg_digitBitsInDoubleIncludingHigh1 = MultiplyByItselfNTimes(.5,DigitBitsInDoubleIncludingHigh1);

//e^x-1. This has far more precision where return value is near 0 than computing e^x first then subtracting 1. Returns -1..infinity, median 0.
//e^x =approxEquals= (1+(.5*x)^DigitBitsInDoubleIncludingHigh1)^(2^DigitBitsInDoubleIncludingHigh1)
const Expm1 = function(x){
	let m = TwoPowNeg_digitBitsInDoubleIncludingHigh1;
	m *= x; //If leave m as 1 here, returns (approx) e aka (1+.5^DigitBitsInDoubleIncludingHigh1)^(2^DigitBitsInDoubleIncludingHigh1)
	for(let i=0; i<DigitBitsInDoubleIncludingHigh1; i++){ //exponent by squaring. deterministic roundoff if strictfp/"use strict".
		const c = m*2;
		const d = m*m;
		m = c+d;
	}
	return m;
};

//e^x
const Exp = (x)=>(1+Expm1(x));

//This derived E is closer than any other double value to the exact value of E
//and exactly equals the constant java.lang.Math.E and browser javascript's Math.E (in firefox and chrome), what fits in double.
//derivedE=2.718281828459045 Math.E=2.718281828459045 diff=0.0.
//wolframalpha says e = 2.718281828459045235360287471352662497757247093699959574966967627724076630353547594571382...
const E = Exp(1);

const Tanh = (x)=>{
	const expX = Exp(x);
	const expNegX = 1/expX;
	const top = expX-expNegX;
	const bottom = expX+expNegX;
	return top/bottom;
};

/** (Tanh(x+epsilon)-Tanh(x))/epsilon */
const DerivTanh = (x)=>{
	//wolframalpha says: 4/(e^-x + e^x)^2
	//4/(e^(-2*x) + e^(2*x) + 2)
	const expTwoX = Exp(2*x);
	const expNegTwoX = 1/expTwoX;
	const sumExps = expTwoX + expNegTwoX;
	const bottom = 2+sumExps;
	return 4/bottom;
};

/** (Sigmoid(x+epsilon)-Sigmoid(x))/epsilon */
const DerivSigmoid = (x)=>{
	//wolframalpha says: e^x/(e^x + 1)^2
	//e^x/(e^(2*x) + 2*e^x + 1)
	//1/(e^x + 2 + e^-x)
	//1/(e^x + e^-x + 2)
	const expX = Exp(x);
	const expNegX = 1/expX;
	const sumExps = expX+expNegX;
	const bottom = sumExps+2;
	return 1/bottom;
	//deriv of sigmoid: 1/(e^x + e^-x + 2)
	//deriv of tanh: 4/(e^(-2*x) + e^(2*x) + 2)
};




