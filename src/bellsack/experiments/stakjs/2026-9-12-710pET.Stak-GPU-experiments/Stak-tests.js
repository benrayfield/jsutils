/* Stak.js example tests. Classic script; no Lamgl or other library is bundled. */
(function(root){
	'use strict';
	const f=Math.fround;
	const source="// Proposed Stak tutorial examples. demoHash identifiers are placeholders.\n// See the tutorial for input order, numeric domains and implementation status.\n\nWaddOne_demoHashMBlok\n\txW\n\tMx M1 WWaddM\nKolb\n\nWWWlength3_demoHashMBlok\n\tzW\n\tyW\n\txW\n\tMx Mx WWmulM\n\tMy My WWmulM WWaddM\n\tMz Mz WWmulM WWaddM\n\tWsqrtM\nKolb\n\nWWWWsphere_demoHashMBlok\n\tradiusW\n\tzW\n\tyW\n\txW\n\tMradius\n\tMx My Mz WWWlength3_demoHashM\n\tWWsubM\nKolb\n\nWtwiceSquare_demoHashMBlok\n\txW\n\tsquaredL\n\tMx Mx WWmulM squaredV\n\tAsquared M2 WWmulM\nKolb\n\nWWWWcube_demoHashMBlok\n\thalfWidthW zW yW xW\n\tMhalfWidth\n\tMx WabsM My WabsM WWmaxM Mz WabsM WWmaxM\n\tWWsubM\nKolb\n\nWWlength2_demoHashMBlok\n\tyW xW\n\tMx Mx WWmulM My My WWmulM WWaddM WsqrtM\nKolb\n\nW5torus_demoHashMBlok\n\tminorW majorW zW yW xW\n\tMminor\n\tMx Mz WWlength2_demoHashM Mmajor WWsubM\n\tMy WWlength2_demoHashM\n\tWWsubM\nKolb\n\nWWWWsineTerm_demoHashMBlok\n\tphaseW frequencyW amplitudeW xW\n\tMamplitude\n\tMx Mfrequency WWmulM Mphase WWaddM WsinM\n\tWWmulM\nKolb\n\nWsumThreeCopies_demoHashMBlok\n\tinputW\n\ttotalL\n\tM0 totalV\n\tC3 Loop\n\t\tcopyJ\n\t\tAtotal Minput WWaddM totalV\n\tPool\n\tAtotal\nKolb\n\nW6sumSix_demoHashMBlok\n\tC6 valuesW\n\ttotalL\n\tM0 totalV\n\tC6 Loop\n\t\tindexJ\n\t\tAtotal Cindex J_values_M WWaddM totalV\n\tPool\n\tAtotal\nKolb\n\nW7rippleRadius_demoHashMBlok\n\tC6 pairsW\n\tangleW\n\tsumL\n\tfrequencyL\n\tM0 sumV\n\tM1 frequencyV\n\tC3 Loop\n\t\tbandJ\n\t\tAsum\n\t\tCband C2 JJimulC J_pairs_M\n\t\tAfrequency Mangle WWmulM\n\t\tCband C2 JJimulC C1 JJiaddC J_pairs_M\n\t\tWWaddM WsinM WWmulM WWaddM sumV\n\t\tAfrequency M1 WWaddM frequencyV\n\tPool\n\tM1 Asum M0.24 WWmulM WWaddM\nKolb\n\nW24tinyNet_demoHashMBlok\n\tC21 weightsW\n\tC3 xyzW\n\tC4 hiddenL\n\tsumL\n\n\tC4 Loop\n\t\thJ\n\t\tCh C4 JJimulC C3 JJiaddC J_weights_M sumV\n\t\tC3 Loop\n\t\t\tkJ\n\t\t\tAsum Ck J_xyz_M\n\t\t\tCh C4 JJimulC Ck JJiaddC J_weights_M\n\t\t\tWWmulM WWaddM sumV\n\t\tPool\n\t\tAsum WtanhM Ch JW_hidden_\n\tPool\n\n\tC20 J_weights_M sumV\n\tC4 Loop\n\t\thJ\n\t\tAsum Ch J_hidden_M\n\t\tC16 Ch JJiaddC J_weights_M\n\t\tWWmulM WWaddM sumV\n\tPool\n\tAsum WtanhM\nKolb\n\nW24rnn4ThreeSteps_demoHashMMMMBlok\n\tC20 weightsW\n\tC4 initialW\n\tC4 stateL\n\tC4 nextL\n\tsumL\n\n\tC4 Loop\n\t\tiJ\n\t\tCi J_initial_M Ci JW_state_\n\tPool\n\n\tC3 Loop\n\t\ttimeJ\n\t\tC4 Loop\n\t\t\ttoJ\n\t\t\tCto C5 JJimulC C4 JJiaddC J_weights_M sumV\n\t\t\tC4 Loop\n\t\t\t\tfromJ\n\t\t\t\tAsum Cfrom J_state_M\n\t\t\t\tCto C5 JJimulC Cfrom JJiaddC J_weights_M\n\t\t\t\tWWmulM WWaddM sumV\n\t\t\tPool\n\t\t\tAsum WtanhM Cto JW_next_\n\t\tPool\n\t\tC4 Loop\n\t\t\tiJ\n\t\t\tCi J_next_M Ci JW_state_\n\t\tPool\n\tPool\n\n\tC4 Loop\n\t\tiJ\n\t\tCi J_state_M\n\tPool\nKolb\n\nW8springEnergy_demoHashMBlok\n\tstiffnessW restLengthW\n\tbzW byW bxW\n\tazW ayW axW\n\terrorL\n\tMax Mbx WWsubM\n\tMay Mby WWsubM\n\tMaz Mbz WWsubM\n\tWWWlength3_demoHashM MrestLength WWsubM errorV\n\tM0.5 Mstiffness WWmulM\n\tAerror Aerror WWmulM WWmulM\nKolb\n\nWWWWcomplexMul_demoHashMMBlok\n\tbiW brW aiW arW\n\tMar Mbr WWmulM Mai Mbi WWmulM WWsubM\n\tMar Mbi WWmulM Mai Mbr WWmulM WWaddM\nKolb\n\nWWcomplexPower8_demoHashMMBlok\n\tinputImagW inputRealW\n\trealL imagL\n\tMinputReal realV MinputImag imagV\n\tC3 Loop\n\t\tsquareIndexJ\n\t\tAreal Aimag Areal Aimag WWWWcomplexMul_demoHashMM\n\t\timagV realV\n\tPool\n\tAreal Aimag\nKolb\n\nWWWbulbPower8_demoHashMMMBlok\n\tzW yW xW\n\tradiusL planarL safeRadiusL safePlanarL\n\tradius8L polarCosL polarSinL azimuthCosL azimuthSinL\n\tMx My Mz WWWlength3_demoHashM radiusV\n\tMx My WWlength2_demoHashM planarV\n\tAradius M0.000000000001 WWmaxM safeRadiusV\n\tAplanar M0.000000000001 WWmaxM safePlanarV\n\tAradius Aradius WWmulM radius8V\n\tAradius8 Aradius8 WWmulM radius8V\n\tAradius8 Aradius8 WWmulM radius8V\n\tMz AsafeRadius WWdivM Aplanar AsafeRadius WWdivM\n\tWWcomplexPower8_demoHashMM polarSinV polarCosV\n\tMx AsafePlanar WWdivM My AsafePlanar WWdivM\n\tWWcomplexPower8_demoHashMM azimuthSinV azimuthCosV\n\tAradius8 ApolarSin WWmulM AazimuthCos WWmulM\n\tAradius8 ApolarSin WWmulM AazimuthSin WWmulM\n\tAradius8 ApolarCos WWmulM\nKolb\n\nWWWmandelbulb8_demoHashMBlok\n\tzW yW xW\n\torbitXL orbitYL orbitZL\n\tnextXL nextYL nextZL\n\tradiusL maximumRadiusL scaleL\n\tM0 orbitXV M0 orbitYV M0 orbitZV M0 maximumRadiusV\n\tC8 Loop\n\t\titerationJ\n\t\tAorbitX AorbitY AorbitZ WWWbulbPower8_demoHashMMM\n\t\tnextZV nextYV nextXV\n\t\tAnextX Mx WWaddM nextXV\n\t\tAnextY My WWaddM nextYV\n\t\tAnextZ Mz WWaddM nextZV\n\t\tAnextX AnextY AnextZ WWWlength3_demoHashM radiusV\n\t\tAmaximumRadius Aradius WWmaxM maximumRadiusV\n\t\tM1 M2 Aradius M0.000000000001 WWmaxM WWdivM WWminM scaleV\n\t\tAnextX Ascale WWmulM orbitXV\n\t\tAnextY Ascale WWmulM orbitYV\n\t\tAnextZ Ascale WWmulM orbitZV\n\tPool\n\tM2 AmaximumRadius WWsubM\nKolb\n\n\nmodulo_testMBlok\n\tsumL\n\tM0 sumV\n\tC4 Loop\n\t\tiJ\n\t\tCi C1 JJisubC C3 JJimodC Ji2fM Asum WWaddM sumV\n\tPool\n\tAsum\nKolb\n\nsignedIntegers_testMMMMBlok\n\tC1 Loop\n\t\tiJ\n\t\tCi C-2147483648 JJiaddC C3 JJimodC Ji2fM\n\t\tCi C-7 JJiaddC C3 JJidivC Ji2fM\n\t\tCi C7 JJiaddC C-3 JJidivC Ji2fM\n\t\tCi C-2147483648 JJiaddC C1 JJidivC Ji2fM\n\tPool\nKolb\n";
	const show=value=>{
		if(Array.isArray(value)||ArrayBuffer.isView(value)) return '['+Array.from(value,show).join(', ')+']';
		if(Object.is(value,-0)) return '-0';
		return String(value);
	};
	function equal(actual,expected,tolerance=0){
		if(Array.isArray(expected)||ArrayBuffer.isView(expected)){
			const a=Array.from(actual),b=Array.from(expected);
			if(a.length!==b.length) throw new Error('Length mismatch: '+show(a)+' versus '+show(b));
			for(let i=0;i<b.length;i++) equal(a[i],b[i],tolerance);
			return;
		}
		if(Object.is(actual,expected)) return;
		if(typeof actual==='number'&&typeof expected==='number'&&Number.isFinite(actual)&&Number.isFinite(expected)&&tolerance>0&&Math.abs(actual-expected)<=tolerance*Math.max(1,Math.abs(expected))) return;
		throw new Error('Expected '+show(expected)+'; received '+show(actual));
	}
	function mustThrow(action,pattern){
		try{
			action();
		}catch(error){
			if(pattern&&!pattern.test(String(error))) throw new Error('Wrong error: '+String(error));
			return String(error);
		}
		throw new Error('Expected rejection, but execution succeeded');
	}
	function reporter(title){
		const rows=[];
		console.group(title);
		return {
			test(name,action){
				console.groupCollapsed(name);
				try{
					const detail=action()||{};
					rows.push({name,status:'PASS',expected:show(detail.expected),actual:show(detail.actual)});
					console.log('PASS',detail);
				}catch(error){
					rows.push({name,status:'FAIL',expected:'Successful check',actual:String(error)});
					console.error('FAIL',error);
				}finally{
					console.groupEnd();
				}
			},
			skip(name,reason){
				rows.push({name,status:'SKIP',expected:'Available implementation',actual:reason});
				console.warn('SKIP '+name+': '+reason);
			},
			finish(){
				const summary={passed:rows.filter(x=>x.status==='PASS').length,failed:rows.filter(x=>x.status==='FAIL').length,skipped:rows.filter(x=>x.status==='SKIP').length,rows,results:rows};
				console.table(rows);
				console.log('Summary',summary);
				console.groupEnd();
				return summary;
			}
		};
	}
	function runNamed(program,name,inputs,capacity=64,intArgs=[]){
		const stream=root.Stak.newStakstream(capacity);
		for(const value of inputs) stream(value);
		program.get(name,intArgs)(stream);
		return stream.toArray();
	}
	function compileAndRun(code,inputs=[],intArgs=[]){
		const program=root.Stak.eval(code);
		const stream=root.Stak.newStakstream(64);
		for(const value of inputs) stream(value);
		if(intArgs.length) program.get(program.names[program.names.length-1],intArgs)(stream);
		else program(stream);
		return stream.toArray();
	}
	function referenceRNN(values){
		let state=values.slice(0,4).map(f);
		const weights=values.slice(4).map(f);
		for(let time=0;time<3;time++){
			const next=[];
			for(let to=0;to<4;to++){
				let sum=weights[to*5+4];
				for(let from=0;from<4;from++) sum=f(sum+f(state[from]*weights[to*5+from]));
				next.push(f(Math.tanh(sum)));
			}
			state=next;
		}
		return state;
	}
	function referenceTiny(values){
		const xyz=values.slice(0,3).map(f),weights=values.slice(3).map(f),hidden=[];
		for(let h=0;h<4;h++){
			let sum=weights[h*4+3];
			for(let k=0;k<3;k++) sum=f(sum+f(xyz[k]*weights[h*4+k]));
			hidden.push(f(Math.tanh(sum)));
		}
		let sum=weights[20];
		for(let h=0;h<4;h++) sum=f(sum+f(hidden[h]*weights[16+h]));
		return [f(Math.tanh(sum))];
	}
	function referenceBulb(input){
		let x=0,y=0,z=0,maximum=0;
		for(let i=0;i<8;i++){
			const r=Math.hypot(x,y,z),theta=Math.atan2(Math.hypot(x,y),z),phi=Math.atan2(y,x),r8=r**8;
			let nx=r8*Math.sin(8*theta)*Math.cos(8*phi)+input[0];
			let ny=r8*Math.sin(8*theta)*Math.sin(8*phi)+input[1];
			let nz=r8*Math.cos(8*theta)+input[2];
			const nextRadius=Math.hypot(nx,ny,nz);
			maximum=Math.max(maximum,nextRadius);
			const scale=Math.min(1,2/Math.max(nextRadius,1e-12));
			x=nx*scale;y=ny*scale;z=nz*scale;
		}
		return [2-maximum];
	}
	function runCPU(){
		const report=reporter('Stak CPU tests: float32 storage, language semantics and content');
		if(!root.Stak){
			report.test('Stak is loaded',()=>{throw new Error('Stak.js is not loaded');});
			return report.finish();
		}
		const check=(name,expected,action,tolerance=0)=>report.test(name,()=>{
			const actual=action();equal(actual,expected,tolerance);return {expected,actual};
		});
		const rejects=(name,action)=>report.test(name,()=>({expected:'Error',actual:mustThrow(action)}));
		check('newStakStream alias',true,()=>root.Stak.newStakstream===root.Stak.newStakStream);
		check('3.4 rounds to its float32 value',f(3.4),()=>{
			const s=root.Stak.newStakstream(64);s(3.4);return s();
		});
		check('LIFO and exact capacity',[2,1,0],()=>{
			const s=root.Stak.newStakstream(2);s(1);s(2);return [s(),s(),s.depth];
		});
		check('Independent streams',[10,20],()=>{
			const a=root.Stak.newStakstream(2),b=root.Stak.newStakstream(2);a(10);b(20);return [a(),b()];
		});
		check('clear resets depth',0,()=>{
			const s=root.Stak.newStakstream(2);s(10);s.clear();return s.depth;
		});
		check('toArray is a snapshot',[1,2],()=>{
			const s=root.Stak.newStakstream(2);s(1);s(2);const a=s.toArray();a[0]=99;return s.toArray();
		});
		check('Signed zero survives storage',true,()=>{
			const s=root.Stak.newStakstream(1);s(-0);return Object.is(s(),-0);
		});
		check('Numeric NaN and infinities survive storage',[true,Infinity,-Infinity],()=>{
			const s=root.Stak.newStakstream(1);s(NaN);const a=Number.isNaN(s());s(Infinity);const b=s();s(-Infinity);return [a,b,s()];
		});
		rejects('Empty stream rejects pop',()=>root.Stak.newStakstream(1)());
		rejects('Full stream rejects push',()=>{const s=root.Stak.newStakstream(1);s(1);s(2);});
		rejects('Explicit undefined is a rejected push, not a pop',()=>{const s=root.Stak.newStakstream(1);s(7);s(undefined);});
		rejects('String push rejected',()=>root.Stak.newStakstream(1)('3'));
		rejects('Two arguments rejected',()=>root.Stak.newStakstream(2)(1,2));
		rejects('Fractional capacity rejected',()=>root.Stak.newStakstream(1.5));
		rejects('Negative capacity rejected',()=>root.Stak.newStakstream(-1));
		check('Top-level postfix arithmetic',[50],()=>compileAndRun('M10 M2 M3 WWaddM WWmulM'));
		check('Subtraction operand order',[7],()=>compileAndRun('M10 M3 WWsubM'));
		check('Division operand order',[4],()=>compileAndRun('M12 M3 WWdivM'));
		check('Each operation rounds to float32',[0],()=>compileAndRun('M16777216 M1 WWaddM M16777216 WWsubM'));
		check('Bare xW binds caller float',[8],()=>compileAndRun('WaddOne_testMBlok xW Mx M1 WWaddM Kolb',[7]));
		check('Ordinary callable stream protocol',[91,8],()=>{
			const values=[91,7];
			function stream(value){
				if(arguments.length===0){
					if(!values.length) throw new Error('Custom stream underflow');
					return values.pop();
				}
				values.push(f(value));
			}
			root.Stak.eval('WaddOne_testMBlok xW Mx M1 WWaddM Kolb')(stream);
			return values;
		});
		check('Klob accepted as spelling alias',[8],()=>compileAndRun('WaddOne_testMBlok xW Mx M1 WWaddM Klob',[7]));
		check('Named locals are private to each call',[20],()=>compileAndRun('Whelper_testMBlok xW Mx M2 WWmulM Kolb Wouter_testMBlok xW Mx Whelper_testM Mx WWaddM Kolb',[f(20/3)]),2e-7);
		check('Scalar local allocation and update',[18],()=>compileAndRun('Wlocal_testMBlok xW squareL Mx Mx WWmulM squareV Asquare M2 WWmulM Kolb',[3]));
		check('Constant loop with immutable index',[45],()=>compileAndRun('sum_testMBlok sumL M0 sumV C10 Loop indexJ Asum Cindex Ji2fM WWaddM sumV Pool Asum Kolb'));
		check('Array block preserves element order',[10,20,30],()=>compileAndRun('WWWarray_testMMMBlok C3 valuesW C0 J_values_M C1 J_values_M C2 J_values_M Kolb',[10,20,30]));
		check('Grouped xyzWWW / MMMxyz preserve three floats',[10,20,30],()=>compileAndRun('WWWgrouped_testMMMBlok xyzWWW MMMxyz Kolb',[10,20,30]));
		check('Grouped local write and read',[10,20,30],()=>compileAndRun('WWWgroupedLocal_testMMMBlok xyzWWW tempLLL MMMxyz tempVVV AAAtemp Kolb',[10,20,30]));
		check('Scalar names beginning with marker letters',[7],()=>compileAndRun('WmarkerNames_testMBlok MajorW AnswerL MMajor AnswerV AAnswer Kolb',[7]));
		check('Derived integer array sizes',[21],()=>compileAndRun('W6sum_testMBlok C2 twoJ Ctwo Jiadd1C threeJ Ctwo Cthree JJimulC countJ Ccount valuesW sumL M0 sumV Ccount Loop indexJ Asum Cindex J_values_M WWaddM sumV Pool Asum Kolb',[1,2,3,4,5,6]));
		check('Read and write local arrays',[9,8,7],()=>compileAndRun('WWWarrayLocal_testMMMBlok C3 inputW C3 copyL C3 Loop indexJ Cindex J_input_M Cindex JW_copy_ Pool C3 Loop indexJ C2 Cindex JJisubC J_copy_M Pool Kolb',[7,8,9]));
		check('Generic Q integer specialization',[10],()=>compileAndRun('JQsumGeneric_testMBlok countJ Ccount valuesW sumL M0 sumV Ccount Loop indexJ Asum Cindex J_values_M WWaddM sumV Pool Asum Kolb',[1,2,3,4],[4]));
		rejects('Integer binding cannot be reassigned',()=>compileAndRun('bad_testMBlok C1 nJ C2 nJ M0 Kolb'));
		rejects('Loop index cannot escape its scope',()=>compileAndRun('bad_testMBlok C2 Loop indexJ Pool Cindex Ji2fM Kolb'));
		rejects('Uninitialized scalar rejected',()=>compileAndRun('bad_testMBlok valueL Avalue Kolb'));
		rejects('Uninitialized array element rejected',()=>compileAndRun('bad_testMBlok C2 valuesL C1 J_values_M Kolb'));
		rejects('Out-of-bounds array read rejected',()=>compileAndRun('WWWbad_testMBlok C3 valuesW C3 J_values_M Kolb',[1,2,3]));
		rejects('Negative array index rejected',()=>compileAndRun('WWWbad_testMBlok C3 valuesW C0 C1 JJisubC J_values_M Kolb',[1,2,3]));
		rejects('Readonly parameter array cannot be written',()=>compileAndRun('WWWbad_testMBlok C3 valuesW M8 C0 JW_values_ M0 Kolb',[1,2,3]));
		rejects('Float cannot be used as an integer index',()=>compileAndRun('WWWbad_testMBlok C3 valuesW M1 J_values_M Kolb',[1,2,3]));
		rejects('Declared output count checked',()=>compileAndRun('Wbad_testMMBlok xW Mx Kolb',[1]));
		rejects('Callee cannot consume caller prefix',()=>compileAndRun('Wbad_testMBlok xW WWaddM Kolb',[9,1]));
		rejects('Recursive call rejected',()=>compileAndRun('Wrecursive_testMBlok Wrecursive_testM Kolb',[1]));
		rejects('Missing Kolb rejected',()=>root.Stak.eval('Wbad_testMBlok xW Mx'));
		rejects('Unexpected Pool rejected',()=>root.Stak.eval('Pool'));
		rejects('Missing Pool rejected',()=>root.Stak.eval('bad_testMBlok C2 Loop iJ M1 Kolb'));
		rejects('Unknown opcode rejected',()=>compileAndRun('notAnOpcode'));
		rejects('Malformed numeric literal rejected',()=>compileAndRun('M3.4.5'));
		check('Positive modulo for negative loop-relative indices',[5],()=>compileAndRun('modulo_testMBlok sumL M0 sumV C4 Loop iJ Ci C1 JJisubC C3 JJimodC Ji2fM Asum WWaddM sumV Pool Asum Kolb'));
		check('Signed integer division and modulo extremes',[1,-2,-2,-2147483648],()=>runNamed(root.Stak.eval(source),'signedIntegers_testMMMM',[]));
		if(typeof root.Stak.toGLSL==='function'){
			check('GLSL signed integer regression shape',[0,4],()=>{
				const gl=root.Stak.toGLSL(source,{entry:'signedIntegers_testMMMM',prefix:'SignedInts'});
				return [gl.inputs,gl.outputs];
			});
			check('GLSL default follows executable top-level code',[0,1],()=>{
				const p=root.Stak.eval('Whelper_testMBlok xW Mx M1 WWaddM Kolb M5 Whelper_testM');
				const gl=root.Stak.toGLSL(p,{prefix:'DefaultTop'});
				return [gl.inputs,gl.outputs];
			});
			check('GLSL respects program.get selected entry',[1,1],()=>{
				const p=root.Stak.eval('Wone_testMBlok xW Mx Kolb WWtwo_testMBlok yW xW Mx My WWaddM Kolb');
				const gl=root.Stak.toGLSL(p.get('Wone_testM'),{prefix:'SelectedEntry'});
				return [gl.inputs,gl.outputs];
			});
			check('GLSL scalar names beginning with marker letters',[1,1],()=>{
				const gl=root.Stak.toGLSL('WmarkerNames_testMBlok MajorW AnswerL MMajor AnswerV AAnswer Kolb');
				return [gl.inputs,gl.outputs];
			});
			rejects('GLSL stack capacity validated',()=>root.Stak.toGLSL('WWWthree_testMMMBlok zW yW xW Mx My Mz Kolb',{capacity:2}));
			rejects('GLSL array bounds validated before shader execution',()=>root.Stak.toGLSL('WWWbad_testMBlok C3 valuesW C3 J_values_M Kolb'));
			rejects('GLSL uninitialized reads rejected',()=>root.Stak.toGLSL('bad_testMBlok C2 valuesL C1 J_values_M Kolb'));
		}
		let program;
		report.test('Compile content examples',()=>{program=root.Stak.eval(source);return {expected:'Named definitions',actual:program.names};});
		if(program){
			check('length3: (3,4,12)',[13],()=>runNamed(program,'WWWlength3_demoHashM',[3,4,12]));
			check('Nested helper preserves underlying caller value',[91,1],()=>runNamed(program,'WWWWsphere_demoHashM',[91,3,4,0,6]));
			check('Sphere inside / surface / outside',[2,0,-2],()=>[0,2,4].map(x=>runNamed(program,'WWWWsphere_demoHashM',[x,0,0,2])[0]));
			check('Cube inside / surface / outside',[1,0,-1],()=>[0,1,2].map(x=>runNamed(program,'WWWWcube_demoHashM',[x,0,0,1])[0]));
			check('Torus tube center / outer surface / hole',[0.5,0,-1.5],()=>[[2,0,0,2,0.5],[2.5,0,0,2,0.5],[0,0,0,2,0.5]].map(v=>runNamed(program,'W5torus_demoHashM',v)[0]));
			check('Two returned floats retain order',[-5,10],()=>runNamed(program,'WWWWcomplexMul_demoHashMM',[1,2,3,4]));
			const nn=[0.2,-0.3,0.4,...Array.from({length:21},(_,i)=>((i*7)%13-6)/9)];
			check('Tiny neural field against scalar equations',referenceTiny(nn),()=>runNamed(program,'W24tinyNet_demoHashM',nn),1e-6);
			const rnn=[0.1,-0.2,0.3,-0.4,...Array.from({length:20},(_,i)=>((i*11)%17-8)/11)];
			check('RNN four nodes, three synchronous cycles',referenceRNN(rnn),()=>runNamed(program,'W24rnn4ThreeSteps_demoHashMMMM',rnn),1e-6);
			check('Mandelbulb origin / north escape',[2,-256],()=>[[0,0,0],[0,0,2]].map(v=>runNamed(program,'WWWmandelbulb8_demoHashM',v)[0]),1e-6);
			for(const xyz of [[0.1,0.2,-0.1],[0.3,-0.2,0.2],[-0.15,0.1,0.25]]) check('Mandelbulb independent spherical reference '+show(xyz),referenceBulb(xyz),()=>runNamed(program,'WWWmandelbulb8_demoHashM',xyz),4e-5);
		}
		return report.finish();
	}
	const gpuCases=[
		{name:'Signed integer division and modulo extremes',entry:'signedIntegers_testMMMM',inputs:[[]],tolerance:0},
		{name:'Positive modulo around zero',entry:'modulo_testM',inputs:[[]],tolerance:0},
		{name:'Length3',entry:'WWWlength3_demoHashM',inputs:[[3,4,12],[0,0,0],[-2,3,-6]],tolerance:2e-6},
		{name:'Sphere',entry:'WWWWsphere_demoHashM',inputs:[[3,4,0,6],[0,0,0,2],[2,0,0,2]],tolerance:2e-6},
		{name:'Torus',entry:'W5torus_demoHashM',inputs:[[2,0,0,2,0.5],[2.5,0,0,2,0.5],[0,0,0,2,0.5]],tolerance:2e-6},
		{name:'Two outputs',entry:'WWWWcomplexMul_demoHashMM',inputs:[[1,2,3,4],[2,0,0,3],[-1,2,3,-4]],tolerance:2e-6},
		{name:'Bounded array loop',entry:'W6sumSix_demoHashM',inputs:[[1,2,3,4,5,6],[-1,-2,-3,-4,-5,-6]],tolerance:2e-6},
		{name:'Tiny neural field',entry:'W24tinyNet_demoHashM',inputs:[[0.2,-0.3,0.4,...Array.from({length:21},(_,i)=>((i*7)%13-6)/9)]],tolerance:8e-5},
		{name:'Three recurrent cycles',entry:'W24rnn4ThreeSteps_demoHashMMMM',inputs:[[0.1,-0.2,0.3,-0.4,...Array.from({length:20},(_,i)=>((i*11)%17-8)/11)]],tolerance:8e-5},
		{name:'Mandelbulb fixed iterations',entry:'WWWmandelbulb8_demoHashM',inputs:[[0,0,0],[0.1,0.2,-0.1],[0,0,2]],tolerance:8e-5}
	];
	function runGPU(options={}){
		const report=reporter('Stak GLSL through Lamgl: real GPU readback');
		const Lamgl=options.Lamgl||root.Lamgl;
		if(typeof Lamgl!=='function'){
			report.skip('Lamgl GPU execution','Lamgl is not loaded. Load this Stak prototype in a page where Lamgl exists, then call StakTests.runGPU().');
			return report.finish();
		}
		if(!root.Stak||typeof root.Stak.toGLSL!=='function'){
			report.test('GLSL transpiler is loaded',()=>{throw new Error('Stak.toGLSL is unavailable');});
			return report.finish();
		}
		const cases=gpuCases;
		for(let testIndex=0;testIndex<cases.length;testIndex++){
			const test=cases[testIndex];
			report.test(test.name,()=>{
				const prefix='StakTest'+testIndex;
				const compiled=root.Stak.toGLSL(source,{entry:test.entry,capacity:64,prefix});
				if(compiled.outputs<1||compiled.outputs>4) throw new Error('GPU test adapter expects 1–4 outputs');
				for(const row of test.inputs) if(row.length!==compiled.inputs) throw new Error('Input count mismatch for '+test.entry);
				const flat=new Float32Array(test.inputs.flat().length?test.inputs.flat():[0]);
				const channels=Array.from({length:4},(_,i)=>i<compiled.outputs?prefix+'_Stak['+i+']':'0.0');
				const shader='#version 300 es\nprecision highp float;\nprecision highp int;\nuniform float StakInputs['+flat.length+'];\nout vec4 StakResult;\n'+compiled.source+'\nvoid main(){\n\tint sampleIndex=int(gl_FragCoord.x);\n\t'+prefix+'_sp='+compiled.inputs+';\n\tfor(int i=0;i<'+compiled.inputs+';i++){\n\t\t'+prefix+'_Stak[i]=StakInputs[sampleIndex*'+compiled.inputs+'+i];\n\t}\n\t'+compiled.entry+'();\n\tStakResult=vec4('+channels.join(',')+');\n}\n';
				if(options.logShaders) console.log(shader);
				let result;
				try{
					result=Lamgl({sh:[1,test.inputs.length,4],sf:shader,StakInputs:flat});
					if(!result||!result.StakResult||typeof result.StakResult.get!=='function') throw new Error('Lamgl did not return a StakResult tensor');
					const data=result.StakResult.get(),actual=[],expected=[];
					const program=root.Stak.eval(source);
					for(let row=0;row<test.inputs.length;row++){
						const cpu=runNamed(program,test.entry,test.inputs[row]);
						for(let col=0;col<compiled.outputs;col++){
							actual.push(data[row*4+col]);expected.push(cpu[col]);
						}
					}
					equal(actual,expected,test.tolerance);
					return {expected,actual,tolerance:test.tolerance,entry:compiled.entry,inputs:test.inputs};
				}catch(error){
					console.error('Shader for failed test:\n'+shader);
					throw error;
				}finally{
					if(result&&result.StakResult&&typeof result.StakResult.free==='function') result.StakResult.free();
				}
			});
		}
		console.log('These are correctness checks, not a performance benchmark. They do not establish a 2× slowdown.');
		return report.finish();
	}
	root.StakTests={runCPU,runGPU,source,examples:source,gpuCases,runNamed};
})(typeof window==='object'?window:globalThis);

/* Stak direct-JS regression tests. Test harness allocations are intentional.
 * Generated Stak functions themselves must not allocate JavaScript objects.
 */
(function(root){
	'use strict';
	const stringifyFunction=Function.prototype.toString;
	const hasOwn=Object.prototype.hasOwnProperty;
	const f=Math.fround;
	const length3Source=`WWWlength3_allocTestMBlok
		zW yW xW
		Mx Mx WWmulM
		My My WWmulM WWaddM
		Mz Mz WWmulM WWaddM
		WsqrtM
	Kolb`;
	const loopsSource=`WfixedLoop_allocTestMBlok
		xW totalL
		M0 totalV
		C9 Loop indexJ
			Atotal Mx WWaddM totalV
		Pool
		Atotal
	Kolb`;
	const nestedSource=`Whelper_allocTestMBlok xW totalL
		Mx M2 WWmulM totalV Atotal
	Kolb
	Wouter_allocTestMBlok xW totalL
		Mx M3 WWaddM totalV
		Atotal Whelper_allocTestM Atotal WWaddM
	Kolb`;
	const arraySource=`W6reverse_allocTestM6Blok
		C6 valuesW C6 copyL
		C6 Loop indexJ
			Cindex J_values_M Cindex JW_copy_
		Pool
		C6 Loop indexJ
			C5 Cindex JJisubC J_copy_M
		Pool
	Kolb`;
	function equal(actual,expected){
		if(actual.length!==expected.length) throw new Error('Wrong length: '+actual.length+' versus '+expected.length);
		for(let i=0;i<expected.length;i++){
			if(!Object.is(actual[i],expected[i])) throw new Error('At '+i+': '+actual[i]+' versus '+expected[i]);
		}
	}
	function call(fn,values,capacity=64){
		const stream=root.Stak.newStakStream(capacity);
		for(const value of values) stream(value);
		fn(stream);
		return stream.toArray();
	}
	function generated(fn){
		if(!Array.isArray(fn.generatedFunctions)||!fn.generatedFunctions.length) throw new Error('No actual generatedFunctions references exposed');
		if(!fn.generatedFunctions.includes(fn)) throw new Error('Public entry absent from generatedFunctions');
		return fn.generatedFunctions;
	}
	function inspectSources(fn){
		const functions=generated(fn);
		for(const helper of functions){
			if(typeof helper!=='function') throw new Error('Generated helper is not a function');
			if(hasOwn.call(helper,'toString')||hasOwn.call(helper,Symbol.toPrimitive)) throw new Error('Generated function overrides source inspection');
			const source=stringifyFunction.call(helper);
			if(helper+''!==source) throw new Error('String coercion hides actual function body');
			if(/\b(?:new|Machine|eval|Function)\b|\.lastRun\s*=|\barguments\b|\.\.\.|Math\.fround/.test(source)) throw new Error('Forbidden generated code:\n'+source);
			if(!/^s\s*=>\s*\{/.test(source)) throw new Error('Generated function must be an arrow with parameter s');
			if((source.match(/=>/g)||[]).length!==1) throw new Error('Generated function contains a nested arrow allocation');
			if(helper.length!==1) throw new Error('Generated function must take exactly one stream argument');
		}
		return functions.length;
	}
	function withoutRuntimeCompilation(fn,inputs){
		const stream=root.Stak.newStakStream(64);
		for(const value of inputs) stream(value);
		const names=['Array','Float32Array','Float64Array','Map','Set','WeakMap','WeakSet','Object','Function'];
		const saved=names.map(name=>root[name]);
		const oldEval=root.Stak.eval;
		const internals=root.Stak._internals;
		const internalNames=Object.keys(internals).filter(name=>typeof internals[name]==='function');
		const internalValues=internalNames.map(name=>internals[name]);
		const denied=new Error('Runtime compiler, allocator or constructor was called');
		function blocked(){throw denied;}
		try{
			root.Stak.eval=blocked;
			for(let i=0;i<internalNames.length;i++) internals[internalNames[i]]=blocked;
			for(let i=0;i<names.length;i++) root[names[i]]=blocked;
			fn(stream);
		}finally{
			for(let i=0;i<names.length;i++) root[names[i]]=saved[i];
			for(let i=0;i<internalNames.length;i++) internals[internalNames[i]]=internalValues[i];
			root.Stak.eval=oldEval;
		}
		return stream.toArray();
	}
	function referenceRNN(values){
		let state=values.slice(0,4).map(f);
		const weights=values.slice(4).map(f);
		for(let cycle=0;cycle<3;cycle++){
			const next=[];
			for(let to=0;to<4;to++){
				let sum=weights[to*5+4];
				for(let from=0;from<4;from++) sum=f(sum+f(state[from]*weights[to*5+from]));
				next.push(f(Math.tanh(sum)));
			}
			state=next;
		}
		return state;
	}
	function run(){
		const rows=[];
		function test(name,action){
			try{
				const detail=action();rows.push({name,status:'PASS',detail});console.log('PASS',name,detail===undefined?'':detail);
			}catch(error){
				rows.push({name,status:'FAIL',detail:String(error)});console.error('FAIL',name,error);
			}
		}
		console.group('Stak direct JavaScript: allocation regression checks');
		const length3=root.Stak.eval(length3Source);
		const nested=root.Stak.eval(nestedSource);
		const loops=root.Stak.eval(loopsSource);
		const arrays=root.Stak.eval(arraySource);
		test('Actual length3 source is direct code',()=>inspectSources(length3));
		test('Every nested helper has an inspectable allocation-free body',()=>inspectSources(nested));
		test('Scalar input bindings consume only caller-supplied floats',()=>equal(call(length3,[3,4,0]),[5]));
		test('Scalar locals and function namespaces are private',()=>equal(call(nested,[100,7]),[100,30]));
		test('Source contains no per-call runtime metrics object',()=>{
			if('lastRun' in length3) throw new Error('Per-call lastRun instrumentation remains');
		});
		test('Compiled length3 works after constructors and compiler are disabled',()=>equal(withoutRuntimeCompilation(length3,[3,4,12]),[13]));
		test('Nested helper works after constructors and compiler are disabled',()=>equal(withoutRuntimeCompilation(nested,[100,7]),[100,30]));
		test('Native fixed loop computes nine repetitions',()=>{
			inspectSources(loops);equal(call(loops,[3]),[27]);
		});
		test('Grouped parameter and local storage preserves order',()=>{
			const fn=root.Stak.eval('WWWgroup_allocTestMMMBlok xyzWWW tempLLL MMMxyz tempVVV AAAtemp Kolb');
			inspectSources(fn);equal(withoutRuntimeCompilation(fn,[1,2,3]),[1,2,3]);
		});
		test('Named local array is scalar storage, with no per-call allocation',()=>{
			inspectSources(arrays);equal(withoutRuntimeCompilation(arrays,[1,2,3,4,5,6]),[6,5,4,3,2,1]);
		});
		test('Repeated calls on separate streams do not share locals',()=>{
			equal(call(arrays,[1,2,3,4,5,6]),[6,5,4,3,2,1]);
			equal(call(arrays,[-1,-2,-3,-4,-5,-6]),[-6,-5,-4,-3,-2,-1]);
		});
		test('Pure stream interface works without depth or capacity properties',()=>{
			let sp=4;const backing=new Float32Array([99,3,4,0,0,0,0,0]);
			function bare(value){
				if(arguments.length===0) return backing[--sp];
				backing[sp++]=value;
			}
			length3(bare);equal(Array.from(backing.subarray(0,sp)),[99,5]);
		});
		test('Caller prefix retained through repeated length3 calls',()=>{
			const stream=root.Stak.newStakStream(64);stream(13579);
			for(let i=0;i<100;i++){
				stream(3);stream(4);stream(0);length3(stream);
				if(stream()!==5) throw new Error('Wrong repeated output');
			}
			equal(stream.toArray(),[13579]);
		});
		if(root.StakTests){
			test('Full four-node RNN runs all three synchronous cycles without runtime allocations',()=>{
				const fn=root.Stak.eval(root.StakTests.source).get('W24rnn4ThreeSteps_demoHashMMMM');
				const values=[0.1,-0.2,0.3,-0.4,...Array.from({length:20},(_,i)=>((i*11)%17-8)/11)];
				inspectSources(fn);equal(withoutRuntimeCompilation(fn,values),referenceRNN(values));
			});
		}
		const report={passed:rows.filter(row=>row.status==='PASS').length,failed:rows.filter(row=>row.status==='FAIL').length,rows};
		console.table(rows);console.groupEnd();return report;
	}
	root.StakAllocationTests={run,inspectSources,withoutRuntimeCompilation,length3Source,nestedSource,loopsSource,arraySource};
})(globalThis);

/* Compiler readability regressions. Allocation in this harness is intentional. */
(function(root){
	'use strict';
	const source=`WWWlength3_readableMBlok
	zW
	yW
	xW
	Mx Mx WWmulM
	My My WWmulM WWaddM
	Mz Mz WWmulM WWaddM
	WsqrtM
Kolb`;
	function expect(condition,message){if(!condition) throw new Error(message);}
	function rejected(source,name){
		let error='';
		try{root.Stak.eval(source);}catch(problem){error=String(problem);}
		expect(error.includes(name)&&/reserv/i.test(error),'Expected reserved-name error for '+name+', got '+error);
	}
	function run(){
		const rows=[];
		function test(name,action){
			try{const detail=action();rows.push({name,status:'PASS',detail});console.log('PASS',name,detail===undefined?'':detail);}
			catch(error){rows.push({name,status:'FAIL',detail:String(error)});console.error('FAIL',name,error);}
		}
		console.group('Stak readable JavaScript and stream rounding');
		const length3=root.Stak.eval(source);
		test('Generated declaration uses var NAME = s=> and original scalar names',()=>{
			expect(/^var WWWlength3_readableM_js0 = s=>\{/.test(length3.jsSource),'Wrong generated declaration');
			for(const name of ['x','y','z']) expect(new RegExp('\\b'+name+'=s\\(\\);').test(length3.jsSource),'Original name missing: '+name);
			expect(!/\bv\d+_/.test(length3.jsSource),'A numbered local prefix remains');
			expect(!/stakstream/.test(length3.jsSource),'Old stream name remains');
		});
		test('Native function inspection exposes the actual s arrow',()=>{
			const text=Function.prototype.toString.call(length3);
			expect(/^s=>\{/.test(text),'Returned function is not the compiled s arrow');
			expect(length3+''===text,'Custom toString hides actual body');
		});
		test('No generated helper performs explicit float32 rounding',()=>{
			const compiled=root.StakTests?root.Stak.eval(root.StakTests.source):length3;
			let inspected=0;
			for(const name of compiled.names){
				const entry=compiled.get(name);
				expect(!/fround/.test(entry.jsSource),'fround remains in '+name);
				inspected+=entry.generatedFunctions.length;
			}
			return inspected+' entry/helper source inspections';
		});
		test('Decimal literal reaches the stream before float32 rounding',()=>{
			const fn=root.Stak.eval('decimal_readableMBlok M3.4 Kolb');
			const storage=new Float32Array(1);let sp=0,pushed;
			function s(value){if(arguments.length===0) return storage[--sp];pushed=value;storage[sp++]=value;}
			fn(s);
			expect(pushed===3.4,'Literal was rounded before calling the stream');
			expect(s()===Math.fround(3.4),'Stream did not supply float32 storage');
		});
		test('Integer-looking float literal also rounds only when pushed',()=>{
			const fn=root.Stak.eval('largeLiteral_readableMBlok M16777217 Kolb');
			const storage=new Float32Array(1);let sp=0,pushed;
			function s(value){if(arguments.length===0) return storage[--sp];pushed=value;storage[sp++]=value;}
			fn(s);
			expect(pushed===16777217,'Literal was pre-rounded by the compiler');
			expect(s()===16777216,'Float32 stream rounding was lost');
		});
		test('Each stack push still rounds intermediate arithmetic',()=>{
			const fn=root.Stak.eval('roundedOps_readableMBlok M16777216 M1 WWaddM M16777216 WWsubM Kolb');
			const s=root.Stak.newStakStream(64);fn(s);
			expect(s()===0,'Intermediate add did not pass through float32 storage');
		});
		test('s cannot be a readonly float parameter',()=>rejected('Wreserved_readableMBlok sW Ms Kolb','s'));
		test('s cannot be a writable float local',()=>rejected('reserved_readableMBlok sL M1 sV As Kolb','s'));
		test('s cannot be an integer binding',()=>rejected('reserved_readableMBlok C1 sJ Cs Ji2fM Kolb','s'));
		test('s cannot be a loop counter',()=>rejected('reserved_readableMBlok C1 Loop sJ M1 Pool Kolb','s'));
		test('JS keywords produce a clear reserved-name error',()=>rejected('Wreserved_readableMBlok classW Mclass Kolb','class'));
		test('Math and internal scratch prefix are reserved',()=>{
			rejected('Wreserved_readableMBlok MathW MMath Kolb','Math');
			rejected('Wreserved_readableMBlok _stakAW M_stakA Kolb','_stakA');
		});
		test('Ordinary user a and b are preserved without scratch collisions',()=>{
			const fn=root.Stak.eval('WWletters_readableMBlok bW aW Ma Mb WWsubM Kolb');
			const s=root.Stak.newStakStream(8);s(7);s(2);fn(s);
			expect(s()===5,'Scratch locals changed named a/b behavior');
			expect(/\ba=s\(\);/.test(fn.jsSource)&&/\bb=s\(\);/.test(fn.jsSource),'Ordinary user names were changed');
		});
		test('CRLF and bare CR normalize to exactly the LF program',()=>{
			const crlf=root.Stak.eval(source.replace(/\n/g,'\r\n'));
			const cr=root.Stak.eval(source.replace(/\n/g,'\r'));
			expect(crlf.source===source&&cr.source===source,'Stored source is not normalized');
			expect(crlf.jsSource===length3.jsSource&&cr.jsSource===length3.jsSource,'Newline style changes generated code');
		});
		test('Input tabs remain visible on generated statements',()=>{
			const fn=root.Stak.eval('Windent_readableMBlok\n\txW\n\t\t\tMx\nKolb');
			expect(/^\t{3}s\(x\);$/m.test(fn.jsSource),'Three input tabs were not retained');
		});
		test('Unindented nested loops gain logical tab indentation',()=>{
			const fn=root.Stak.eval('Wloops_readableMBlok xW totalL M0 totalV C2 Loop outerJ C3 Loop innerJ Atotal Mx WWaddM totalV Pool Pool Atotal Kolb');
			const lines=fn.jsSource.split('\n');
			expect(lines.some(line=>/^\tfor\(/.test(line)),'Outer loop indentation is missing');
			expect(lines.some(line=>/^\t\tfor\(/.test(line)),'Inner loop indentation is missing');
			expect(lines.some(line=>/^\t\t\ts\(total\);/.test(line)),'Loop body indentation is missing');
			const s=root.Stak.newStakStream(16);s(3);fn(s);expect(s()===18,'Nested loop behavior changed');
		});
		const report={passed:rows.filter(row=>row.status==='PASS').length,failed:rows.filter(row=>row.status==='FAIL').length,rows};
		console.table(rows);console.groupEnd();return report;
	}
	root.StakReadabilityTests={run,source};
})(globalThis);

/* CPU optimization regressions. Load after Stak.js and Stak-tests.js. No GPU execution. */
(function(root){
	'use strict';
	const cases=[
		{name:'Subtraction and division operand order',code:'noncommutative_perfMBlok M10 M3 WWsubM M2 WWdivM Kolb',inputs:[],expected:[3.5]},
		{name:'Caller prefix survives a compiled call',code:'Wprefix_perfMBlok xW Mx M3 WWmulM Kolb',inputs:[7],prefix:[-31,0.25],expected:[-31,0.25,21]},
		{name:'Earlier local read survives overwriting that local',code:'Wsnapshot_perfMBlok xW valueL Mx valueV Avalue M99 valueV Avalue WWsubM Kolb',inputs:[12],expected:[-87]},
		{name:'Several earlier reads survive several writes',code:'Wreads_perfMBlok xW valueL Mx valueV Avalue Avalue M2 valueV Avalue WWaddM WWsubM Kolb',inputs:[9],expected:[-2]},
		{name:'Stack value carries through a fixed loop',code:'Wcarry_perfMBlok xW Mx C4 Loop indexJ M2 WWmulM Pool Kolb',inputs:[3],expected:[48]},
		{name:'Zero-iteration loop preserves its incoming stack',code:'Wzero_perfMBlok xW Mx C0 Loop indexJ M9 WWaddM Pool Kolb',inputs:[5],expected:[5]},
		{name:'Loop can grow the return tuple',code:'Wgrow_perfMMMBlok xW Mx C2 Loop indexJ M1 Pool Kolb',inputs:[7],expected:[7,1,1]},
		{name:'Nested fixed loops preserve a scalar accumulator',code:'Wnested_perfMBlok xW totalL M0 totalV C2 Loop outerJ C3 Loop innerJ Atotal Mx WWaddM totalV Pool Pool Atotal Kolb',inputs:[4],expected:[24]},
		{name:'Helper call preserves an earlier pending result',code:'Whelper_perfMBlok xW Mx M2 WWmulM Kolb Wouter_perfMMBlok xW Mx M1 WWaddM Mx Whelper_perfM Kolb',inputs:[6],expected:[7,12]},
		{name:'Helper locals do not alias their caller',code:'WhelperLocal_perfMBlok xW valueL M2 valueV Mx Avalue WWmulM Kolb WcallerLocal_perfMBlok xW valueL M5 valueV Mx WhelperLocal_perfM Avalue WWaddM Kolb',inputs:[3],expected:[11]},
		{name:'Read-only array order and sparse access',code:'WWWarray_perfMMMBlok C3 valuesW C2 J_values_M C0 J_values_M C1 J_values_M Kolb',inputs:[2,5,9],expected:[9,2,5]},
		{name:'Array read survives an overwrite',code:'arrayOld_perfMBlok C2 valuesL M7 C0 JW_values_ C0 J_values_M M9 C0 JW_values_ C0 J_values_M WWsubM Kolb',inputs:[],expected:[-2]},
		{name:'Vector local components preserve independent values',code:'WWWvector_perfMMMBlok xyzWWW copyLLL MMMxyz copyVVV AAAcopy Kolb',inputs:[3,4,5],expected:[3,4,5]},
		{name:'Indexed loop restores array values in reverse order',code:'WWWarrayLoop_perfMMMBlok C3 valuesW C3 copyL C3 Loop indexJ Cindex J_values_M Cindex JW_copy_ Pool C3 Loop indexJ C2 Cindex JJisubC J_copy_M Pool Kolb',inputs:[1,2,3],expected:[3,2,1]},
		{name:'Stack swap keeps evaluation order',code:'swap_perfMMBlok M11 M19 Kolb',inputs:[],expected:[11,19]}
	];
	function equal(actual,expected){
		if(actual.length!==expected.length) throw new Error('Wrong tuple width: '+JSON.stringify(actual));
		for(let i=0;i<expected.length;i++) if(!Object.is(actual[i],expected[i])) throw new Error('At '+i+': '+actual[i]+' versus '+expected[i]);
	}
	function call(fn,inputs=[],prefix=[]){
		const s=root.Stak.newStakStream(128);
		for(const value of prefix) s(value);
		for(const value of inputs) s(value);
		fn(s);
		return s.toArray();
	}
	function run(){
		const rows=[];
		const test=(name,action)=>{
			try{action();rows.push({name,status:'PASS'});}
			catch(error){rows.push({name,status:'FAIL',error:String(error)});console.error(name,error);}
		};
		for(const item of cases) test(item.name,()=>{
			for(const inline of [false,true]){
				const fn=root.Stak.eval(item.code,{inline});
				equal(call(fn,item.inputs,item.prefix),item.expected);
				if(root.StakAllocationTests) root.StakAllocationTests.inspectSources(fn);
			}
		});
		test('Reported stream calls match executed calls, including helpers and loops',()=>{
			const dollar={code:'Wdollar_perfMBlok xW Mx C3 Loop $counterJ M2 WWmulM Pool Kolb',inputs:[4]};
			for(const item of cases.concat(dollar))for(const inline of [false,true]){
				const fn=root.Stak.eval(item.code,{inline}),values=new Float32Array(128);
				let depth=0,calls=0;
				function s(value){calls++;if(arguments.length===0)return values[--depth];values[depth++]=value;}
				for(const value of item.inputs)s(value);
				calls=0;fn(s);
				if(calls!==fn.stats.streamCalls)throw new Error('Stream count: '+calls+' versus '+fn.stats.streamCalls);
			}
		});
		test('Inlining is opt-in and default code is unchanged',()=>{
			const code='rounding_perfMBlok M16777216 M1 WWaddM M16777216 WWsubM Kolb';
			const defaultFn=root.Stak.eval(code),strict=root.Stak.eval(code,{inline:false}),inline=root.Stak.eval(code,{inline:true});
			equal(call(defaultFn),[0]);equal(call(strict),[0]);equal(call(inline),[1]);
			if(defaultFn.jsSource!==strict.jsSource) throw new Error('Default and explicit stack code differ');
		});
		test('Inline output uses the supplied stream only at retained boundaries',()=>{
			const code='WWboundary_perfMBlok yW xW Mx My WWaddM M2 WWmulM Kolb';
			const strict=root.Stak.eval(code),inline=root.Stak.eval(code,{inline:true});
			const values=new Float32Array(8);let depth=0,calls=0;
			function s(value){calls++;if(arguments.length===0) return values[--depth];values[depth++]=value;}
			s(4);s(5);calls=0;inline(s);
			if(depth!==1||values[0]!==18||calls!==3) throw new Error('Expected two pops and one push, got '+calls);
			if(inline.jsSource.includes('fround')) throw new Error('Rounding emitted early');
			if((inline.jsSource.match(/\bs\(/g)||[]).length>=(strict.jsSource.match(/\bs\(/g)||[]).length) throw new Error('No stream calls removed');
		});
		test('Inline invocation does not compile or allocate',()=>{
			const fn=root.Stak.eval(cases[8].code,{inline:true});
			equal(root.StakAllocationTests.withoutRuntimeCompilation(fn,[6]),[7,12]);
		});
		const counts=[
			['Three literal loads plus two additions','add_perfMBlok M2 M3 M4 WWWadd3M Kolb',5],
			['Literal and named input loads plus multiplication','Wcount_perfMBlok xW Mx M2 WWmulM Kolb',3],
			['Fixed loop scales only its executed operations','loopCount_perfMBlok sumL M0 sumV C3 Loop indexJ Asum M2 WWaddM sumV Pool Asum Kolb',11],
			['Unexecuted loop contributes no float operations','zeroCount_perfMBlok C0 Loop indexJ M1 M2 WWaddM Pool M7 Kolb',1],
			['Allocated but unread array does not multiply operation count','W8unused_perfMBlok C8 valuesW M2 M3 WWaddM Kolb',3],
			['One sparse array read costs one regardless of array extent','W8sparse_perfMBlok C8 valuesW C7 J_values_M M2 WWmulM Kolb',3],
			['Helper body counted for each call','WcountHelper_perfMBlok xW Mx M2 WWmulM Kolb countCaller_perfMBlok M4 WcountHelper_perfM WcountHelper_perfM Kolb',7]
		];
		for(const [name,code,expected] of counts) test(name,()=>{
			const strict=root.Stak.eval(code,{inline:false}),inline=root.Stak.eval(code,{inline:true});
			if(strict.stats.estimatedFlops!==expected||inline.stats.estimatedFlops!==expected) throw new Error('Expected '+expected+' logical FLOPs; stack='+strict.stats.estimatedFlops+' inline='+inline.stats.estimatedFlops);
		});
		if(root.StakCPU)test('Decaying meter has a one-second half-life and preserves total work',()=>{
			const m=root.StakCPU.meter(1);m.reset(0);m.add(100,7,0);
			const start=m.read(0),later=m.read(1000);
			if(start.total!==700||later.total!==700||later.pixels!==100)throw new Error('Cumulative count changed while idle');
			if(Math.abs(later.rate/start.rate-0.5)>1e-12)throw new Error('Wrong exponential half-life');
			m.reset(2000);const empty=m.read(2000);
			if(empty.total!==0||empty.rate!==0||empty.pixels!==0)throw new Error('Meter reset failed');
		});
		const result={passed:rows.filter(row=>row.status==='PASS').length,failed:rows.filter(row=>row.status==='FAIL').length,rows};
		console.table(rows);console.log('Stak CPU optimization checks',result.passed+' passed, '+result.failed+' failed');
		return result;
	}
	root.StakPerformanceTests={run,cases,call};
})(globalThis);
