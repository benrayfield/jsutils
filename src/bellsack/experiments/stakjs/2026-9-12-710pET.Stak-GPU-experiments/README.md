# Stak GPU experiments — 2026-09-12

Unzip, then open **Stak-GPU-playground.html** locally. No server, npm, modules, workers, CDN or network requests are required. It embeds the supplied Lamgl and all experiment code. A WebGL2 browser with float render targets is required.

**Mandelbulb-Lamgl-only.html** is the smaller independent example: handwritten GLSL + the supplied Lamgl. It contains no Stak compiler. Use it to separate Lamgl/browser problems from Stak problems.

## Try it

1. Start at 512 × 384 (use 256 × 192 on a slow device). Drag the bulb to orbit; wheel to dolly. Select Mandelbrot for 2D pan/zoom.
2. Switch between **Stak → GLSL stack** and **Handwritten GLSL**. The latter always uses the bundled field, not arbitrary edits. Both use the same camera, ray marcher and shading.
3. Edit Stak; click **Apply code & render**. A rejected edit retains the last working shader. Sources normalize CRLF and CR to LF. Tab inserts a literal tab. Original safe variable names and source tab levels are preserved in generated GLSL, with logical indentation as a minimum. Reserved GLSL names are escaped; source and output cannot always have identical line breaks because a token can emit multiple statements.
4. Run **CPU checks**, then **GPU correctness checks**. Details appear in the console; save a JSON report if something fails.
5. Run **Benchmark default fractal**. It benchmarks the unmodified bundled example at the current resolution/camera, not your edits. The measured ratio is stack shader time / handwritten shader time: 2 means twice as slow. This does not assume that ratio in advance.
6. Run **Measure multiply/add GFLOP/s** for a separate arithmetic-throughput experiment. Use **Save test / benchmark report** to retain samples, camera, sizes and the arithmetic shader.

Compilation can pause the main thread. Cancel stops between GPU submissions; it cannot interrupt a shader already submitted. Timers and completion waits time out after 15 seconds. Rendering has at most one outstanding completion fence rather than accumulating an unlimited queue during dragging.

## What is actually measured?

- **GPU kernel time:** asynchronous `EXT_disjoint_timer_query_webgl2` elapsed time, in nanoseconds converted to milliseconds. The query surrounds Lamgl compute, excludes `tensor.display()` and readback, and discards disjoint/context-loss samples. First-use driver compilation can perturb results; comparison uses three warmups and five rotated timed rounds.
- **JS submission time:** CPU wall time around the Lamgl call. It is not GPU execution time and never substitutes for GPU GFLOP/s.
- **Render submissions/s:** a one-second-half-life decaying rate. It tends to zero while idle. One completion fence limits queued work; it is not a display-refresh measurement or a kernel throughput prediction.
- **Arithmetic GFLOP/s:** `pixels × iterations × 32 / GPU seconds / 1e9`. Each iteration updates four live vec4 states, each with one multiply and one add per component. Multiply-add counts as two whether fused or not. Uniform-dependent states and coefficients prevent trivial constant output; a tiny readback is checked against an independent float32 CPU recurrence after timing. Loads, setup, output sums and loop overhead are excluded from the numerator. This is a **nominal shader-arithmetic throughput estimate**, not hardware instruction instrumentation, peak device FLOP/s, or Mandelbulb FLOP/s. The driver can optimize code.
- **Source reference operations:** the existing Stak estimate includes literal/named float loads and treats many math primitives as one. It is useful for relative source work, **not a hardware FLOP count**. The bulb has variable numbers of field calls along rays; this page does not manufacture a total fractal GFLOP rate.

If timer queries are not exposed, rendering and readback tests still work. Timing/throughput buttons are disabled; the page explicitly says unavailable. No `gl.finish()` spin-wait is used. See the [Khronos timer specification](https://registry.khronos.org/webgl/extensions/EXT_disjoint_timer_query_webgl2/).

## Stack / numerical semantics

Each fragment invocation has its own `float stak_Stak[64]` and `int stak_sp`. `S(value)` pushes, `s()` pops. The generated functions and helper calls share that operand stack; named locals belong to each function. Their storage is separate from the 64-float operand capacity. Static stack bounds and initialization checks remain enabled. The example bulb's stack peak is four floats; it calls the isolated Stak `length3` helper.

The GLSL backend retains explicit stack reads/writes; GPU inlining or scalar replacement is the driver's decision. No optional GLSL expression-folding backend was added in this experiment. The inspected JS uses the previous optional inline backend and is not what renders the GPU image. No runtime Machine objects were reintroduced into Stak JS kernels.

The bulb follows the power-8 distance-estimation method in the supplied ForestCurveFit reference, with 10 fixed field iterations, finite candidate calculations, origin/polar-axis guards and branchless freezing of escaped orbits. The shared renderer uses up to 80 ray-march steps and may branch/early-exit. That host renderer is not Stak user code. The handwritten comparison also uses fixed field iterations: this isolates stack representation better than comparing against a different early-exit algorithm.

The ray marcher clips to a radius-1.6 sphere centered at the origin. Edits must remain suitable nonnegative distance estimates inside that bound; arbitrary density fields or shapes outside it need a different marcher/bound. Mandelbrot uses 64 fixed iterations and returns packed RGB; all integers 0…0xffffff fit exactly in float32. GPU compiler, trig implementations, operation association and float32 roundoff can change fractal boundary pixels. Mandelbrot deep zoom remains limited by float32 coordinates.

`demoHash` names are tutorial placeholders, not verified cryptographic identities. This is an experimental local playground, not a production untrusted-code sandbox or completed Bellsack integration. Runtime-variable-sized integer signatures and other deferred language features were not expanded here.

## Lamgl integration

The supplied **LamglFromBellsack0575_2026-9-12-540p.js** is copied byte-for-byte as **Lamgl.js**. No Lamgl code changes, CPU tensor uploads or full-image GPU readbacks occur during normal rendering.

```js
const tensor=Lamgl({
	sh:[384,512,4],
	sf:shaderString,
	resolution:new Float32Array([512,384]),
	camera:new Float32Array([0.65,0.25,3.3]),
	view:new Float32Array([-0.65,0,3.5])
}).color;
document.getElementById('viewport').appendChild(Lamgl.glCanv);
tensor.display();
tensor.free();
```

Lamgl returns a map of named output Tensors, here `.color`. The canvas is mounted before first display, so Lamgl does not install its normal fullscreen negative-z-index style. CSS keeps the canvas inside the viewport. Freeing after display returns the texture lease to Lamgl's pool; submitted GPU commands remain ordered. Correctness tests deliberately use tiny `.get()` readbacks. PNG export reads the displayed canvas only when requested.

## File roles and validation

- `Stak-GPU-playground.html`: complete self-contained interactive experiment.
- `Mandelbulb-Lamgl-only.html`: independent self-contained handwritten example.
- `Stak.js`: current CPU implementation plus the existing GLSL backend, updated for names/indentation; no Bellsack engine changes.
- `FractalGPU.js`, `FractalChecks.js`, `GPUTiming.js`, `viewer.js`: shader templates, real-browser checks, timer/arithmetic helpers and host UI. Set `FractalGPU.sources` from the two `.stak.txt` files if using these separately.
- Four `.frag` files: complete generated/default and handwritten shaders for inspection.
- `Stak-tests.js`: CPU/compiler regressions and Lamgl readback checks.
- `validation/`: local CPU, UI/mock, software-GLES test results and rendered previews. Read its report for exact execution coverage. Software-renderer timings are not represented as hardware GPU performance, and mock UI tests are not claimed as browser testing.
- `FILE-HASHES.json`: SHA-256 fingerprints of the separately delivered code.

The actual browser, driver and GPU remain part of the experiment. Run the supplied readback tests on your machine before trusting its benchmark. Nothing here establishes a universal 2× slowdown or predicts your gaming performance.
