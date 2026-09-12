// Timer lifecycle unit tests with a mock GL. Not hardware timing evidence.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import path from 'node:path';
const base=path.dirname(new URL(import.meta.url).pathname);
const tests=[];
function fixture(supported=true){
	let now=0,id=0,active=null,disjoint=false,lost=false,available=true,ns=3500000;
	const deleted=[],ext={TIME_ELAPSED_EXT:1,GPU_DISJOINT_EXT:2};
	const gl={CURRENT_QUERY:3,QUERY_RESULT_AVAILABLE:4,QUERY_RESULT:5,
		getExtension:()=>supported?ext:null,isContextLost:()=>lost,
		getParameter:()=>disjoint,getQuery:()=>active,
		createQuery:()=>({id:++id}),beginQuery:(_,q)=>{assert.equal(active,null);active=q;},
		endQuery:()=>{assert.notEqual(active,null);active=null;},
		getQueryParameter:(_,key)=>key===4?available:ns,
		deleteQuery:q=>deleted.push(q.id),flush:()=>{}};
	const context={performance:{now:()=>now},requestAnimationFrame:cb=>setImmediate(()=>{now+=16;cb(now);}),console};
	vm.createContext(context);
	vm.runInContext(fs.readFileSync(path.join(base,'GPUTiming.js'),'utf8'),context);
	return {timer:context.GPUTiming.create(gl),gl,deleted,
		set now(v){now=v;},set available(v){available=v;},set ns(v){ns=v;},
		set disjoint(v){disjoint=v;},set lost(v){lost=v;}};
}
async function test(name,fn){await fn();tests.push({name,passed:true});}
await test('Missing extension does not provide fake elapsed time',async()=>{
	const f=fixture(false);assert.equal(f.timer.supported,false);assert.equal(f.timer.begin('x'),false);
	assert.equal(f.timer.poll().length,0);await assert.rejects(f.timer.measure(()=>{}),/extension unavailable/);
});
await test('Nanoseconds convert to GPU milliseconds and query is deleted',()=>{
	const f=fixture();assert.equal(f.timer.begin('frame'),true);assert.equal(f.timer.begin('second'),false);
	f.timer.end();assert.equal(f.timer.pending,1);const result=f.timer.poll();
	assert.equal(result[0].tag,'frame');assert.equal(result[0].ms,3.5);assert.equal(f.deleted.length,1);assert.equal(f.timer.pending,0);
});
await test('Unavailable query stays pending without blocking',()=>{
	const f=fixture();f.available=false;f.timer.begin(7);f.timer.end();assert.equal(f.timer.poll().length,0);assert.equal(f.timer.pending,1);
	f.available=true;assert.equal(f.timer.poll()[0].tag,7);
});
await test('Disjoint sample is discarded and deleted',()=>{
	const f=fixture();f.timer.begin('bad');f.timer.end();f.disjoint=true;
	assert.match(f.timer.poll()[0].error,/disjoint/);assert.equal(f.timer.pending,0);assert.equal(f.deleted.length,1);
});
await test('Context loss discards pending sample',()=>{
	const f=fixture();f.timer.begin('lost');f.timer.end();f.lost=true;
	assert.match(f.timer.poll()[0].error,/loss/);assert.throws(()=>f.timer.begin('new'),/context lost/);
});
await test('Expired unavailable query fails explicitly',()=>{
	const f=fixture();f.available=false;f.timer.begin('timeout');f.timer.end();f.now=15001;
	assert.match(f.timer.poll()[0].error,/timed out/);assert.equal(f.deleted.length,1);
});
await test('Zero/invalid elapsed query fails explicitly',()=>{
	const f=fixture();f.ns=0;f.timer.begin('zero');f.timer.end();assert.match(f.timer.poll()[0].error,/Invalid/);
});
await test('Clear handles an active query',()=>{
	const f=fixture();f.timer.begin('active');f.timer.clear();assert.equal(f.deleted.length,1);assert.equal(f.timer.begin('next'),true);f.timer.end();f.timer.clear();
});
await test('Async measurement waits then returns GPU time',async()=>{
	const f=fixture();let draws=0;const ms=await f.timer.measure(()=>{draws++;});assert.equal(draws,1);assert.equal(ms,3.5);
});
await test('Pending query prevents competing measurement',async()=>{
	const f=fixture();f.timer.begin('pending');f.timer.end();await assert.rejects(f.timer.measure(()=>{}),/Drain/);f.timer.clear();
});
await test('Draw exception still ends its active timer query',async()=>{
	const f=fixture();await assert.rejects(f.timer.measure(()=>{throw Error('draw failed');}),/draw failed/);
	assert.equal(f.timer.pending,1);f.timer.poll();assert.equal(f.timer.begin('recovered'),true);f.timer.end();f.timer.clear();
});
const report={kind:'Mock timer lifecycle unit tests; not browser or hardware timing',passed:tests.length,failed:0,tests};
fs.writeFileSync(path.join(base,'gpu-timer-validation.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
