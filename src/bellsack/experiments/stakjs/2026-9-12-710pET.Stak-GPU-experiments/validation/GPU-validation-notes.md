# Validation performed for this experiment

## Actual GLSL execution

The generated and handwritten shaders were compiled, linked, rendered to RGBA32F textures, and read back through EGL / OpenGL ES 3.2 on Mesa 25.2.8, llvmpipe LLVM 20.1.2.

This is **software GLES correctness validation**, not a hardware GPU benchmark and not an end-to-end browser test. No browser executable was available in the build environment. The delivered page performs the real Lamgl / browser checks and GPU timer measurements on the user's computer.

Nineteen shader cases passed:

- Three independent float32 multiply/add recurrence probes: 64, 256, and 1024 iterations. All eight output floats matched the rounded CPU recurrence exactly on this renderer.
- Ten existing Stak GPU cases: signed integer division/modulo extremes, positive modulo, length3, sphere, torus, complex multiplication, bounded array loop, tiny neural field, recurrent neural cycles, and the tutorial Mandelbulb field.
- Four rendered images: Mandelbrot and Mandelbulb, each using generated stack GLSL and handwritten GLSL. All output channels were finite, at both low resolution and 512 × 384.
- Two fifteen-point probes of the new Mandelbulb distance estimator, including origin, axes, interior, exterior, and near-boundary points. Both implementations were within 0.0005 absolute distance of the independent handwritten CPU-double reference.

Mandelbrot generated/manual rendered pixels matched exactly in the tested views. Mandelbulb point probes agreed within 8.35e-8 between the two GLSL implementations. Rare rendered pixels differ more because tiny floating-point differences affect chaotic iteration, hit thresholds, and normals. The JSON reports retain actual max/mean channel differences rather than claiming bit-exact 3D images.

The runner caught and prompted fixes for two real GLSL reserved-word mistakes in initial handwritten shaders: `active` and `packed`. The generated Stak compiler already escapes reserved local names.

## Timer lifecycle unit tests

Eleven tests use a mock WebGL query API to exercise missing extension behavior, nanosecond conversion, pending results, disjoint samples, context loss, timeout, invalid elapsed time, cleanup, async completion, competing queries, and draw exceptions. These validate control flow only, not extension support or timings on any physical GPU.

## Reproduce developer-side validation

With Node, Python, Pillow, Mesa EGL, and a software GLES3 renderer available:

```sh
node make-gpu-validation.mjs --large
python gpu-validate.py gpu-cases.json --out gpu-validation-large
node test-gpu-timing.mjs
```

The generator loads sibling Stak.js, Stak-tests.js, FractalGPU.js, GPUTiming.js, and the two .stak.txt examples. The Python runner writes the PNG previews and detailed JSON. It deliberately does not report performance timing for llvmpipe.
