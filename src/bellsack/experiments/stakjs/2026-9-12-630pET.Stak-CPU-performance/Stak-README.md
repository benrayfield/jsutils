# Stak.js — CPU inlining and Mandelbrot comparison

Extract the ZIP and open **Stak-playground.html**. No installation, modules, workers, network or GPU is needed.

The viewer starts at **192×128 with Stak inlining enabled**. Drag to pan; scroll to zoom. There is no hidden resolution change during dragging. Choose a lower resolution if needed. Enable **Repeat rendering** to measure completed frames per second; leave it off to render on edits/view changes and watch the FLOP rate decay while idle.

## Four CPU executions

- **Stak, Inline arithmetic off:** the previous generated stack-call implementation, with float32 rounding on every source push.
- **Stak, Inline arithmetic on:** the same Stak source compiled to direct numeric expressions where possible. Parameters and outputs still use `s`. This is a generic compiler option; it does not recognize Mandelbrot specially.
- **Hand-written, same fixed work:** independently written JavaScript with the same 64 iterations, escape mask, clamp and palette. This is the appropriate baseline for compiler overhead.
- **Hand-written, fastest:** independent JavaScript with early escape, analytic cardioid/period-2 interior checks, and reused squared values. It performs less work. It is available for display and is a separate benchmark row.

All four kernels accept one `s` argument, pop imaginary then real coordinates, and push one packed RGB number. Normal return is undefined. The calculation itself creates no objects, arrays or closures. Stream/pixel buffers and functions are created outside invocation. Show **Selected JavaScript** to inspect exactly what runs.

**Apply code & render** uses the edited source and switches to Stak mode. Manual modes always use the bundled example; editing Stak does not rewrite the hand-written code. Restore example and reset view are separate actions.

## Inlining API and precision

```js
const strict=Stak.eval(source); // default: inline:false
const inlined=Stak.eval(source,{inline:true});
const s=Stak.newStakStream(64);
s(3);
s(4);
s(0);
inlined(s);
console.log(s());
console.log(inlined.jsSource);
console.log(inlined.stats);
```

Names are preserved, `s` and the documented compiler/JS names remain reserved, and generated code uses tabs. There is no generated `Math.fround`. Function bodies, loops, reads and writes still come from the parsed Stak operations.

Inlining keeps a symbolic operand stack during compilation. It combines arithmetic into expressions, protects an earlier read when a local is overwritten, and commits surviving stack values at helper-call and loop boundaries. Function/helper boundaries still use `s`. Source line endings do not force a stream write; logical dependencies determine what can be combined.

**Removed Float32Array writes also remove their rounding.** Intermediate inline values use ordinary JS number precision. Input and final output still round through `s`, and any surviving stream boundary still rounds. Strict and inline modes can therefore differ near fractal boundaries. This is explicitly selectable; strict remains the API default. The viewer defaults to inline for speed. This is not bit-identical float32 optimization.

`inlined.stats.inline` identifies the option. `.stats.streamCalls` counts executed stream calls including fixed loops and called helpers. For the default Mandelbrot: strict **5,897**, inline **3** calls per pixel, excluding the caller's two pushes and output pop. Source-level stack/resource checks remain conservative when inlining removes physical stack traffic.

## FLOP counters

The UI shows cumulative estimated reference FLOPs, completed pixels, per-frame work, and an exponentially decaying reference-FLOP rate with a **one-second half-life**. It counts work on completed pixels, including pixels from a frame later cancelled by movement. Benchmark work is reported separately. Reset counters clears totals and rate.

`fn.stats.estimatedFlops` is the statically derived source-work count per call:

- Arithmetic and Math operations count one each; three-input addition counts two.
- Literal loads and named float reads count one per scalar, including a single sparse array element read. Explicit int-to-float conversion counts one.
- Executed constant-loop iterations and called helper bodies are included.
- Integer bookkeeping, array allocation size, stack stores, canvas writes, compilation and UI work do not count.

The default example has **2,948 reference FLOPs per pixel**. Reading one array element does not multiply this by the array's size. These units include loads by design and are an estimate, **not hardware instruction counts**. The fastest manual mode skips iterations; its displayed rate uses the common reference workload and is labelled reference-equivalent. Optimized modes can eliminate repeated loads too.

The meter is updated outside kernels; there is no counter increment attached to every generated arithmetic operation.

```js
const m=StakCPU.meter(1);
m.add(pixelsCompleted,fn.stats.estimatedFlops);
console.log(m.read()); // {total,rate,pixels,halfLife}
```

## Benchmark procedure

Click **Benchmark default Mandelbrot**. It uses the bundled, unedited 64-iteration source for every Stak/manual row, at the current camera and selected resolution. It never compares arbitrary edited code against an unrelated built-in function. Moving, editing or changing mode cancels an active benchmark. The button can cancel it too.

All modes receive the same precomputed float32 coordinate grid and the same Float32Array stream implementation. Each is warmed. Three measured rounds rotate execution order, process whole frames and report median time per frame. A checksum consumes the packed output. Compilation, allocation, UI scheduling and canvas transfers are outside measured intervals. The kernel timing includes stream I/O and the common small checksum loop.

**× manual fixed** means `mode milliseconds / hand-written fixed-work milliseconds`. A value of 2 means twice as slow. The fastest row uses a different, cheaper execution algorithm; its ratio is not solely compiler overhead. **Compute FPS** is CPU throughput without painting or frame scheduling. The viewer's **completed frames/s** measures finished displayed frames when repeat rendering is enabled. Do not treat either as a guarantee of 60 FPS on another computer or zoom level.

Color differences are checked separately on up to 512 identical sampled pixels against the manual fixed baseline. Full default-grid verification also found inline versus manual fixed identical at all 24,576 pixels; strict versus manual differed at two boundary pixels. Color differences are not silently treated as timing failures.

The measured reference run is in **CPU-benchmark.json**, including dimensions, camera, all timed samples, ratios and environment. Use the browser button to measure your own PC. **Save benchmark JSON** exports its result. For an optional Node comparison, run `node run-cpu-benchmark.mjs`; it evaluates scripts in the real global scope so VM-context global-lookup overhead does not contaminate the timing.

## Files and verification

- `Stak.js`: existing library plus optional inline JS generation and counters. The core change is 56 added / 17 replaced physical lines, net +39.
- `MandelbrotCPU.js`: the independently written manual functions.
- `StakCPU.js`: host-side meter and benchmark harness.
- `Stak-playground.html`: self-contained viewer, editor, CPU modes/tests and comparison.
- `Stak-tests.js`: original tests plus CPU optimization tests, also embedded in the HTML.
- `Stak-performance-tests.js`: the new optimization suite separately.
- `Mandelbrot.stak.txt`: bundled editable reference program.
- `ByteRect.js`: the existing MIT-licensed SimpleCanvas excerpt.
- `CPU-benchmark.json`, `Stak-validation.json`: measured timings and validation details.
- `mandelbrot-inline-generated.js`, `length3-inline-generated.js`: inspectable generated samples.

The original 100 CPU/compiler checks and 27 new optimization/counter checks pass. Static source audits cover 36 generated bodies. Host/UI checks cover the actual packaged scripts using an instrumented DOM and canvas; no real browser executable was available here. Fixed and fastest manual references passed 76,809 pixel comparisons at multiple iteration counts. Existing GLSL generation is retained unchanged; no GPU execution or speed tests were performed for this update.

The older tutorial is included for language syntax. Its strict-stack examples still apply; this README defines the new optional inlining and measurement behavior. Hash verification, Bellsack integration and runtime-sized GPU arrays remain outside this update.
