import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const dir=path.dirname(fileURLToPath(import.meta.url));
// Real global scope avoids VM-context global-lookup overhead in CPU timing.
const context=globalThis;
for(const name of ['Stak.js','MandelbrotCPU.js','StakCPU.js'])vm.runInThisContext(fs.readFileSync(path.join(dir,name),'utf8'),{filename:name});
const source=fs.readFileSync(path.join(dir,'Mandelbrot.stak.txt'),'utf8');
const report=await context.StakCPU.benchmark(context.StakCPU.createModes(source),{width:192,height:128,progress:text=>console.log(text)});
report.environment={runtime:process.version,platform:process.platform,architecture:process.arch};
fs.writeFileSync(path.join(dir,'CPU-benchmark.json'),JSON.stringify(report,null,2)+'\n');
console.table(report.rows.map(({name,millisecondsPerFrame,computeFPS,timesManualFixed,packedColorDifferences})=>({name,millisecondsPerFrame,computeFPS,timesManualFixed,packedColorDifferences})));
