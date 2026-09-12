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
