# Stak.js: from your first number to a programmable world

**A tutorial and design trial for Bellsack content creators**

You are making a game where the ground can be a bowl, a bridge, a spring, a fractal, or a small neural network. You want to reuse something another player made, connect its controls to your own creation, and understand what it does without studying the whole game engine.

Stak is the proposed language for those reusable calculations. It describes functions that take numbers and return numbers. Bellsack supplies numbers from the world and uses the results to draw terrain or calculate game behavior.

This book teaches the Stak prototype supplied in `Stak.js` and `Stak-playground.html`. The playground compiles and runs ordinary JavaScript functions, and generates GLSL that uses a float stack. Bellsack integration, automatic content hashes, runtime-dependent GLSL allocation and performance claims remain future work. The CPU and optional Lamgl test buttons report their results separately.

The name here is **Stak.js**, without the extra c in Stack.

## How to use this tutorial

There are three useful stopping points:

- **First creations:** arithmetic, functions, sphere, cube, torus, and how they enter Bellsack. You can make interesting terrain without understanding a neural network.
- **Reusable machinery:** loops, arrays, safe indices, tiny networks, springs, and explicit state. You can build components that other creators reuse.
- **Language designer territory:** Mandelbulb numerics, LSTM, neural tape, variable-sized interfaces, hashing, resource accounting, and backend tradeoffs. These explain where the design is strong and where it needs more work.

At each stop, change one example and predict its result before reading the answer. The important question is whether you can still understand your own creation a week later.

There are two kinds of code blocks. Blocks labeled `text` containing `Blok`, `M`, `W`, etc. are proposed Stak source. Short equations, stack traces and conceptual layouts are explanations, not alternative Stak syntax. JavaScript and GLSL blocks are explicitly labeled.

`demoHash` is always an invented hash placeholder. A real editor would calculate real hashes and could display short friendly names. Nothing in this tutorial assumes that placeholder hashes provide content addressing.

## Run these examples in the supplied prototype

Open `Stak-playground.html`, then open the browser console. Stak is a classic script global; no module loader is required.

```js
const stream = Stak.newStakStream(64);
const length3 = Stak.eval(`
WWWlength3_demoHashMBlok
	zW yW xW
	Mx Mx WWmulM
	My My WWmulM WWaddM
	Mz Mz WWmulM WWaddM
	WsqrtM
Kolb`);
stream(3);
stream(4);
stream(0);
length3(stream);
console.log(stream()); // 5
```

`Stak.newStakstream` is an alias. Calling the returned function with no arguments pops; calling it with one number pushes. Values are float32, so pushing 3.4 and popping returns `Math.fround(3.4)`. The stream also exposes `.depth`, `.capacity`, `.clear()` and `.toArray()`.

Every Stak function receives exactly this one JavaScript argument. Helpers use the same stream, but may consume only their own inputs; caller values below their frame are protected. Named parameters and locals are private to each invocation. Results are pushed on the stream, not returned through JavaScript's normal return value.

`Stak.eval(source)` parses whitespace-separated tokens and generates an ordinary JavaScript function. Parsing and code generation happen before calling that function. With one definition it runs that definition. With multiple definitions and no top-level instructions it defaults to the last one. Prefer `program.get('WWWlength3_demoHashM')` to choose a definition explicitly. `.names` lists definitions and `.ast` exposes the parsed structure. Both Kolb and the spelling Klob close a definition; examples use Kolb.

For a generic helper, `program.get(name, [integerShapeArguments])` binds integer parameters while preserving the one-stream JavaScript interface. The GLSL generator specializes these integer shapes; Q does not promise dynamic GPU array allocation.

```js
const generated = Stak.toGLSL(length3, {
	entry: 'WWWlength3_demoHashM',
	capacity: 64,
	prefix: 'example'
});
console.log(generated.source);
console.log(generated.entry, generated.inputs, generated.outputs);
```

The generated source supplies helpers, a float array and a stack pointer. It is intended for embedding into a shader; it does not contain a complete rendering pipeline. The playground's separate Lamgl button shows how to run small comparisons when Lamgl is present. CPU speed and GLSL speed must be measured separately.

### Inspect the actual generated JavaScript

```js
console.log(Function.prototype.toString.call(length3));
console.log(length3.jsSource); // also includes called helpers
```

The function itself contains the calculation. It does not construct a Machine, allocate parameter arrays, create local closures or call an interpreter. During invocation, generated functions use numeric locals, primitive math, loops, direct helper calls and the supplied stream’s zero/one-argument interface. ASTs, metadata and function objects are created during compilation.

The generated stream parameter is named `s`, and scalar names such as `x`, `y`, and `z` are preserved. Full declarations in `.jsSource` use `var NAME_js0 = s=>{ ... };`. Native function inspection shows the arrow itself, starting `s=>{`. The stream owns float32 rounding: the generated function contains no `Math.fround`, and `M3.4` generates `s(3.4)` without early rounding.

The name `s`, JavaScript keywords, `Math`, `NaN`, `Infinity`, `undefined`, `arguments`, `eval`, and the `_stak` scratch-name prefix are reserved. They produce a compilation error when used as variable names. Array elements use `name_0`, `name_1`, etc.; collisions are rejected. Output uses tabs matching source indentation and logical loop depth. CRLF and bare CR are normalized to LF.

The playground now starts with an editable CPU Mandelbrot image. Drag to pan, scroll to zoom, then change the Stak iteration count or palette and click **Apply code & render**. Its two float inputs are complex-plane real and imaginary coordinates; its output is one packed RGB integer. Stak calculates the three color channels, and the host copies them into the supplied SimpleCanvas-style ByteRect pixel buffer. This 2D example is separate from the later 3D Mandelbulb example.

The JS backend gives each named-array element its own numeric local. An array-indexing loop may therefore expand into fixed-index code. An outer repeated-cycle loop can remain a loop when its own counter does not affect those indices. Large neural-tape examples can exceed the default source-size budget; the compiler reports this explicitly. Their GLSL form retains local arrays and compact loops.

When a bundle ends with a very large function, choose the entry during compilation:

```js
const f=Stak.eval(source,{
	entry:'WWWlength3_demoHashM',
	maxSourceChars:1000000,
	maxAnalysisSteps:5000000
});
```

The advanced examples remain useful language designs, but the original interpreter’s ability to execute them is not proof that the direct JS backend will produce suitably small code for every one. The explicit source budget prevents that distinction from being hidden.

## 1. A surface is a question you ask at a point

Imagine asking, at each position in space: “How much is this point inside my shape?”

For a sphere centered at the origin, one answer is:

```text
answer = radius - distanceFromOrigin
```

With radius 2:

| Point | Answer | Meaning |
| --- | ---: | --- |
| (0,0,0) | 2 | Inside |
| (2,0,0) | 0 | On the surface |
| (3,0,0) | -1 | Outside |

The surface is where the answer changes through zero. The game can sample that function to find a surface and its direction. It does not need a triangle mesh as the source of the shape.

This is a **standalone shape function**. Later, we will make it a contribution to Bellsack's combined terrain. That extra step matters when many waves overlap.

First we need enough Stak to subtract two numbers.

## 2. Put numbers down; let an operation consume them

A stack is a row of values whose rightmost value is used first. You can think of it as a small workbench.

```text
M2 M3 WWaddM
```

Read it as: “Put 2 down. Put 3 down. Add the last two numbers.”

| Token just executed | Stack, bottom to top |
| --- | --- |
| `M2` | 2 |
| `M3` | 2, 3 |
| `WWaddM` | 5 |

`M` means producing a float on this workbench. Each leading `W` on an operation means consuming one float. The trailing `M` means producing one result.

So `WWaddM` is a two-number operation that leaves one number. `WsqrtM` consumes one number and leaves its square root.

```text
M10 M2 M3 WWaddM WWmulM
```

This leaves 50: the addition happens first because it appears first. There is no precedence table to memorize. Operations are written **after** their operands; this is called postfix notation.

Subtraction and division preserve operand order:

```text
M10 M3 WWsubM
```

leaves 7, not -7. The operation reads its two arguments in the order they were pushed: first 10, then 3.

| Operation | Result |
| --- | --- |
| `WWaddM` | first + second |
| `WWsubM` | first - second |
| `WWmulM` | first * second |
| `WWdivM` | first / second |
| `WWminM` | smaller of two |
| `WWmaxM` | larger of two |
| `WabsM` | absolute value |
| `WsqrtM` | square root |

**Try:** Write `(7-2)*3`. Then write `7-(2*3)`. These should give 15 and 1.

**Answers:** `M7 M2 WWsubM M3 WWmulM` and `M7 M2 M3 WWmulM WWsubM`.

The spelling `M2` is a float literal. A bare `2` is not a Stak instruction. Negative constants can be written `M-2`; literal tokens do not have to be JavaScript identifiers. Function and variable names do.

## 3. Give a calculation a name

Here is a function that adds one to its input:

```text
WaddOne_demoHashMBlok
	xW
	Mx M1 WWaddM
Kolb
```

The pieces are small:

- `WaddOne_demoHashMBlok` starts the definition. One W means one float input; one M means one float output.
- `xW` consumes and names the one input float already supplied by the caller. It does not push a constant or use the integer stack.
- `Mx` reads the input named x, pushing a copy of its value.
- `Mx M1 WWaddM` computes x+1.
- `Kolb` ends the definition. The one value left on the function's stack is its result.

There is no return statement. To call it, use its name without Blok:

```text
M7 WaddOne_demoHashM
```

This leaves 8. `Blok` is attached to the definition token, so the parser can distinguish a definition from a call immediately.

The definition does not reach into the world, ask for time, or read a neighboring function's x. With the same input it describes the same calculation. That is what we mean here by a **pure function**.

You may keep pushing and reading parameters. Reading x does not destroy its binding. If you accidentally supply no input, leave two results despite a one-result signature, or read an undeclared name, a compiler must reject the function.

**Try:** Define a function that squares one float. **Answer:** bind x, then `Mx Mx WWmulM`.

## 4. Three floats can mean one position

A 3D position is three floats in a chosen order: x, y, z. Stak's basic interface counts the floats even when you think of the three together as one vector.

```text
WWWlength3_demoHashMBlok
	zW
	yW
	xW
	Mx Mx WWmulM
	My My WWmulM WWaddM
	Mz Mz WWmulM WWaddM
	WsqrtM
Kolb
```

Call it like this:

```text
M3 M4 M0 WWWlength3_demoHashM
```

The result is 5.

**Why are the parameters declared z, y, x?** The caller put x down first and z last. The first declaration takes the top value, which is z. This is a stack, so binding order is reversed. That reversal is one of the real costs of the syntax; the editor should show the caller's natural order alongside the definition.

The three input floats are not three separate function calls. They are one length calculation on one position. A future compiler may hold them in a GLSL vec3, three scalar registers, or part of a stack. None of those representations changes its logical input width of three.

**Try:** Predict the length of (0,0,2), then (1,2,2). **Answers:** 2 and 3.

## 5. Your first sphere

This function takes x,y,z,radius, in that order:

```text
WWWWsphere_demoHashMBlok
	radiusW
	zW
	yW
	xW
	Mradius
	Mx My Mz WWWlength3_demoHashM
	WWsubM
Kolb
```

The radius waits on the stack while the length helper runs. The helper can consume only its own three arguments; it must leave the radius alone. The subtraction then consumes radius and distance.

```text
M0 M0 M0 M2 WWWWsphere_demoHashM
```

returns 2. Change the point to (3,0,0), keeping radius 2, and the result becomes -1.

To move the sphere to center (cx,cy,cz), subtract its center from the sampled point before calling this helper. To change its size, change radius. You do not need to rewrite the formula.

**Creator exercise:** Imagine a ball rolling on the top of a sphere. Increase the radius while keeping its center fixed. The top rises; the bottom moves down too. If you expected the bottom to stay put, you also need to move the center. Geometry alone does not decide which behavior your editor tool should have.

## 6. Remember an intermediate value

Parameters are readonly. Sometimes you want a private named temporary:

```text
WtwiceSquare_demoHashMBlok
	xW
	squaredL
	Mx Mx WWmulM squaredV
	Asquared M2 WWmulM
Kolb
```

`squaredL` reserves one local float. `squaredV` writes it by consuming one float. `Asquared` reads it.

| Storage | Read | Write/bind |
| --- | --- | --- |
| Readonly float parameter x | `Mx` | `xW` at entry |
| Private float local sum | `Asum` | `sumV`, after `sumL` |

Allocating a local does not put a float on the working stack. It also does not initialize it. `Asquared` before its first write is an error, not a way to inspect the previous call's memory.

Declare parameters and local storage at the start of the function. Later assignments may update those float locals. Each invocation owns its own storage, even when function A calls B and B calls another helper.

A scalar input is declared with `xW`; a scalar local is reserved with `sumL`. Neither needs C1. For an array, a preceding integer size selects its width, such as `C6 valuesW`. Integer size tokens do not supply float values. A float constant is written M1, but adding M1 before xW would incorrectly bind that constant instead of the caller’s argument.

## 7. A cube, a torus, and a reusable two-number length

A cube with half-width h has the standalone positive-inside field `h-max(abs(x),abs(y),abs(z))`:

```text
WWWWcube_demoHashMBlok
	halfWidthW zW yW xW
	MhalfWidth
	Mx WabsM My WabsM WWmaxM Mz WabsM WWmaxM
	WWsubM
Kolb
```

With halfWidth=1, the center returns1, (1,0,0) returns0, and (2,0,0) returns-1. The cube extends from -1 to +1 on every axis. This is a correct sign/surface function, but its magnitude is not the Euclidean distance outside edges and corners. Do not assume every zero-set formula is a safe distance for sphere tracing.

A torus is a ring-shaped tube. Its major radius locates the tube centerline; its minor radius is the tube thickness. First define a reusable length2 helper:

```text
WWlength2_demoHashMBlok
	yW xW
	Mx Mx WWmulM My My WWmulM WWaddM WsqrtM
Kolb
```

The torus takes x,y,z,major,minor. Its hole runs along Y:

```text
W5torus_demoHashMBlok
	minorW majorW zW yW xW
	Mminor
	Mx Mz WWlength2_demoHashM Mmajor WWsubM
	My WWlength2_demoHashM
	WWsubM
Kolb
```

This reads as `minor-length2(length2(x,z)-major,y)`. One length finds your horizontal distance from the Y axis. Subtracting major tells how far you are from the circular tube centerline. The second length includes your vertical displacement.

At major=2 and minor=0.5:

| Sample | Value | Meaning |
| --- | ---: | --- |
| (2,0,0) | 0.5 | Middle of the tube |
| (2,0.5,0) | 0 | Top of the tube |
| (0,0,0) | -1.5 | In the hole |

Use major>minor>0 for an ordinary doughnut. A bounding sphere centered here needs radius at least major+minor before any additional support halo or deformation is considered.

There are five input floats, so its signature begins W5. Counts1–4 are written as repeated markers; larger counts use the number. You do not have to read twenty-one W letters when writing a small neuralnet.

**Try:** Keep major fixed and increase minor. The tube gets thicker; its centerline does not move. Increase major instead: the tube centerline moves farther from the axis. If this distinction feels clear, you are ready to expose both as separate game controls.

## 8. Turn a shape into Bellsack content

You now have functions that describe a sphere, a cube and a torus. A Bellsack **species** is reusable code. A **wave** is one instance, with its own parameter values. Many instances can use the same compiled code.

A useful authoring workflow is:

1. Select a wave by its center or Ed wireframe.
2. Fork its species code and change a small formula.
3. Inspect a few field values and its bounding sphere.
4. Drag its parameter Eds; watch the terrain change.
5. Copy/paste whole waves and connect their hands to nearby content.

Those are the intended editor operations, not an assertion that the current Stak integration already implements them.

### The proposed species adapter

For this tutorial, a geometry function receives a **local sample point**, followed by its named shape parameters. A generated Bellsack adapter would:

- Read the wave center from `wave.X.p`, `wave.Y.p`, `wave.Z.p`.
- Subtract that center from the queried world point.
- Gather the shape parameters in the entry function's argument order.
- Call the pure function with numbers only.
- Apply the agreed support/influence convention to obtain this wave's density contribution.

This local-coordinate adapter is a proposed convenience. The pure function has no hidden access to the wave: the adapter explicitly passes the computed numbers. When physics perturbs the center or a parameter, it must build the corresponding perturbed arguments as well.

The sample coordinates are temporary query inputs. **They do not allocate three extra persistent Vars for every wave.** The distinction between the sample block and instance parameters must be part of the species entry contract, not inferred from whether some arbitrary name happens to contain an X.

Here is the intended simple mapping for persistent parameters:

| Declared parameter block | Width | Persistent values |
| --- | ---: | --- |
| `Size` | 1 | `wave.Size.p` |
| `Radii` | 2 | `wave.Radii.p`, `wave.Radii1.p` |
| `Anchor` | 3 | `wave.Anchor.p`, `wave.Anchor1.p`, `wave.Anchor2.p` |
| `DoubleAnchor` | 6 | `wave.DoubleAnchor.p` through `wave.DoubleAnchor5.p` |
| `Weights` | 21 | `wave.Weights.p` through `wave.Weights20.p` |

Use `ArrayName` for index zero and append the numeric index for later elements. No persistent arbitrary Var-to-string JSON mapping is necessary. The compiler can derive a layout cache from the source's declarations.

There is one naming collision to catch: a six-element block `Anchor` already owns `Anchor1`. A separate parameter block named `Anchor1` would collide. Reject such a species declaration with an error naming both sources. Do not silently rename one.

The entry function's conventional argument order is the reverse of its parameter-binding declarations, preserving each block internally. The compiler can show that order to the author and use it to generate the flat layout. This detail must be specified once, not changed between the CPU and GPU adapters.

The wave's standard center, bounding radius R, and influence/existence p remain their established fields. The tutorial does not add `Live`, duplicate radius coordinates, or another persistent state system. In particular, `wave.p==0` still means absent; a negative nonzero value can still be a signed influence. Geometry Size and support R need not be the same quantity.

### What the spider handles mean

For the current design, each scalar Ed has elbow fields `eeX/eeY/eeZ`, hand fields `ehX/ehY/ehZ`, and **`ei=0 Lone,1 X,2 Y,3 Z`**. These are Var fields, not additional child dimensions.

The compiler receives the associated scalar `.p` values. It does not read hand geometry to decide how a multiply works. The editor/joint system uses the hand position and type to establish the intended scalar relationship. An XYZ-looking hand can join any matching X/Y/Z scalar groups, even when their Vars are in different arrays or waves. Consecutive parameter packing is not the definition of an XYZ joint.

If you expose Anchor as three floats, the editor can initialize their types X/Y/Z. If only its X component is joined to another X, Y and Z remain independent. A standalone scalar can have X type without automatically acquiring two companion Vars.

The lasso is a display of the wave's bound, centered on its true 3D center. The R elbow can sit on that bound while its hand joins another radius. The proposed default-on option that multiplies an R elbow direction by `R.p` is an editor setting, outside Varjs. None of this belongs in Stak's pure arithmetic semantics.

For copying, select whole waves; an individually selected elbow or hand is an editing target, not a partial clipboard wave. A tutorial should not quietly settle the earlier `camPos` versus cursor3d offset disagreement: the clipboard anchor convention must be chosen in the editor design. Whichever anchor is chosen, copy all selected wave state and preserve internal relationships consistently.

### Bounded density is a separate contract

A raw field such as `radius-length(point)` stays negative forever as you move away. Summing many such raw fields would make far-away waves affect every point, defeating bounds and changing the meaning of each shape.

The inspected `.14` baseline already uses a configurable global density offset plus the sum of compact wave contributions. Its active B Bell5 path subtracts the Gaussian value at the bounding radius, clamps that remainder at zero, and multiplies by signed weight. Its startup offset is `.05`. These observations are about the supplied `.14` file, not a requirement to preserve that particular offset forever.

A tutorial preview may show the zero set of one raw helper by itself. An actual multi-wave preview must show the **sum with the real background/offset**, not a separate independently rendered surface for every wave. Do not silently replace that sum with max-union, or assume every individual zero is a rendered surface. An exactly zero empty region is not by itself evidence of a surface crossing; the old file already discusses that problem.

One simple support envelope, as a mathematical building block, is:

```text
u = max(0,1-distanceSquared/boundingRadiusSquared)
envelope = u*u*u
```

It is zero outside the bounding sphere and falls smoothly to zero at its boundary. Multiplying by it limits influence, but does not automatically resolve the aggregate isovalue, empty-space convention, or desired visual size. Those are adapter/scene decisions to check before promising a drop-in Stak species.

**Checkpoint:** Can you change a torus's major radius, identify the exact Var that holds it, and explain whether its current bounding sphere is still large enough? If not, stop here. More language syntax will not repair a confused species contract.

## 9. Combine, bend and reuse shapes

Within one compound geometry function using positive-inside fields:

| Intent | Formula |
| --- | --- |
| Either shape | `max(a,b)` |
| Both shapes | `min(a,b)` |
| A with B cut out | `min(a,-b)` |

A cup can start with an outer sphere/cylinder-like helper and subtract an inner one. A track can start with a tube and bend the coordinates passed to it. These operators describe one component; the world still combines wave contributions using Bellsack's aggregate rule.

Sharp min/max corners can be useful for a cube, but they create derivative creases. When you want smooth forces or a rounded blend, choose a smooth formula deliberately. It will generally change the exact surface. Smoothness, shape fidelity, and evaluation cost are different choices.

One reusable ingredient is a sine term:

```text
WWWWsineTerm_demoHashMBlok
	phaseW frequencyW amplitudeW xW
	Mamplitude
	Mx Mfrequency WWmulM Mphase WWaddM WsinM
	WWmulM
Kolb
```

This computes `amplitude*sin(frequency*x+phase)`. `WsinM` consumes and returns one float, with angles in radians.

**Try:** Set amplitude to zero. The result is zero regardless of phase. Set frequency to zero: the term becomes a constant offset controlled by phase. Increase frequency: the number of ripples across a fixed stretch grows.

To bend a tube, evaluate its shape at `(x,y-sineTerm(x),z)` instead of `(x,y,z)`. You are changing the coordinate system in which the tube is sampled. No mesh-editing operation is needed.

### Reuse does not share variable names

Two calls to sineTerm have separate parameter bindings. A helper named length3 can also name a local x without colliding with the caller's x. Functions communicate through their arguments and results.

Later, a player could publish a bridge curve helper and another player could use it inside a conveyor, an elevator guide, or a spring's preferred path. Reuse is valuable even when the helper is only three lines of math.

## 10. Repeat something without changing an integer variable

The floating stack and the integer calculations serve different purposes. Floats describe geometry and forces. Integers describe sizes and indices.

```text
C3 bandsJ
Cbands Jiadd1C withBiasJ
```

This binds bands=3 and withBias=4. `C` pushes/reads an integer. A trailing `J` binds it. These names cannot be assigned again in their scope.

| Integer expression | Meaning |
| --- | --- |
| `C3` | integer 3 |
| `Cbands` | read bands |
| `Cbands Jiadd1C` | bands+1 |
| `Cbands C2 JJimulC` | bands*2 |
| `Cbands C1 JJisubC` | bands-1 |

These are expressions that produce values. They do not increment the stored bands binding.

A loop consumes an integer count and supplies a fresh readonly index at each iteration:

```text
C3 Loop
	bandJ
	// Cband is 0, then 1, then 2 in successive iterations.
Pool
```

The source has one binding site, bandJ. Each iteration has its own band value. A nested loop may read an outer band's value, but cannot rewrite it. A called function cannot read it unless the caller passes it explicitly.

This is enough to make a summing function:

```text
WsumThreeCopies_demoHashMBlok
	inputW
	totalL
	M0 totalV
	C3 Loop
		copyJ
		Atotal Minput WWaddM totalV
	Pool
	Atotal
Kolb
```

Input 2 gives 6. The float total changes; the integer loop binding does not. Private scratch changing during a call does not make the function depend on previous calls.

**Try:** Change C3 to C0. The result should be zero, because total was initialized before the loop. If its only initialization had been inside the loop, a zero-iteration path could make a later read invalid.

There is no while loop here. Counts derive from integer constants and, in the advanced extension, explicit integer parameters. No float on the geometry stack secretly chooses how many repetitions run.

## 11. Arrays without raw pointers

A small array is a group of floats with one name and a known length. Here is a function that takes six floats:

```text
W6sumSix_demoHashMBlok
	C6 valuesW
	totalL
	M0 totalV
	C6 Loop
		indexJ
		Atotal Cindex J_values_M WWaddM totalV
	Pool
	Atotal
Kolb
```

The caller pushes values[0] through values[5], then calls the function. The declaration takes that whole block while preserving the order inside it. It does not reverse all six components.

`J_values_M` consumes one integer index and pushes one float from values. The underscores mark a reserved named-array operation. It is not a user function named values. This deliberately avoids the old ambiguous proposal `WvaluesM`.

| Task | Code |
| --- | --- |
| Declare six readonly parameter floats | `C6 valuesW` |
| Declare six local scratch floats | `C6 nextL` |
| Read parameter element 2 | `C2 J_values_M` |
| Write float 7 to local element 2 | `M7 C2 JW_next_` |
| Read that local element | `C2 J_next_M` |

The indexed write `JW_next_` consumes an integer and a float. It may write only a local array owned by this function. `JW_values_` would be rejected because values is a readonly parameter.

### The bounds proof is part of the program's meaning

In the sumSix example, the loop index ranges from 0 through 5. The array has six elements. That is the entire proof that the access is in bounds.

For three amplitude/phase pairs, use a six-float block:

| Band | Amplitude index | Phase index |
| ---: | ---: | ---: |
| 0 | 0 | 1 |
| 1 | 2 | 3 |
| 2 | 4 | 5 |

The formulas are `2*band` and `2*band+1`. With band in 0..2, both indices are in 0..5. They are still relative to this named array. They cannot reach a neighbor's parameter block.

This is pointer arithmetic in the useful mathematical sense of calculating offsets. It is not an exposed machine address. Start the compiler with simple bounded affine offsets like these. More difficult expressions should get an honest “bounds proof not supported” diagnostic, not silently pass because a bit mask happens to wrap addresses somewhere.

## 12. A tiny Fourier terrain control

This function receives an angle followed by three amplitude/phase pairs. It returns a rippled radius:

```text
W7rippleRadius_demoHashMBlok
	C6 pairsW
	angleW
	sumL
	frequencyL
	M0 sumV
	M1 frequencyV
	C3 Loop
		bandJ
		Asum
		Cband C2 JJimulC J_pairs_M
		Afrequency Mangle WWmulM
		Cband C2 JJimulC C1 JJiaddC J_pairs_M
		WWaddM WsinM WWmulM WWaddM sumV
		Afrequency M1 WWaddM frequencyV
	Pool
	M1 Asum M0.24 WWmulM WWaddM
Kolb
```

The radius is `1+0.24*sum(amplitude[band]*sin(frequency*angle+phase[band]))`, with frequencies 1,2,3.

The mutable frequency is a float used in sine arithmetic. It is never an array index or loop bound. The readonly band integer selects the corresponding pair. We have not introduced an implicit float-to-integer conversion.

With all amplitudes zero, the radius is exactly 1. With only the first amplitude set to 1 and phase 0, angle 0 gives 1 and angle π/2 gives approximately 1.24. The complete program's signed radius may become negative if arbitrary amplitudes are allowed; a species can choose explicit parameter limits or a smooth positive-radius transform.

This is a small relative of the sine-controlled tracks used in Dagball. For a 3D track, combine it with a chosen path/tube coordinate system. Parameter pairs may become two Lone Eds; they do not need to pretend to be XYZ positions.

**Exercise:** How many floats are needed for five pairs? Ten. What is the largest phase offset? `2*4+1=9`. To stop updating the declaration and loop separately, define an integer band count and derive twice that count for the array size.

## 13. Tensors are arrays with an agreed shape

There is no need to make memory stop being a flat array just because the math uses a matrix.

For a matrix with rows and columns, choose row-major order:

```text
offset = row*columns + column
```

For two rows and three columns, row 0 owns offsets 0,1,2; row 1 owns 3,4,5. The compiler's bounds reasoning knows that row<2 and column<3, so offset<6.

For eleven vec3 values, the array has **33 scalar slots**. Vector v's components use `3*v+0`, `3*v+1`, `3*v+2`. A unary function on a vec3 can be one conceptual operation while still consuming and returning three floats.

Tuples and tensors should have a documented component order at each helper boundary. A future vec3/matrix view can improve authoring, but it must preserve the scalar input counts and cannot silently allocate one slot for a whole vector.

This is where a small neural network becomes ordinary array arithmetic rather than a special magical kind of game content.

## 14. A tiny neural field: 21 adjustable weights

You already know how to build shapes with arithmetic. A neuralnet is another way to combine those numbers. You can make its weights ordinary species parameters, expose them as Vars, and let their values reshape the surface.

Start with **three coordinate inputs, four hidden neurons, and one output**. Four hidden neurons are enough to learn a few smooth distinctions between regions. They do not magically provide a useful shape: the weight values still determine what it does.

The equations are:

```text
hidden[h] = tanh(bias[h] + wx[h]*x + wy[h]*y + wz[h]*z)
output = tanh(outputBias + sum(outputWeight[h]*hidden[h]))
```

There are `4*(3+1)+(4+1)=21` weights including biases. The function receives the three coordinates followed by those 21 weights: **24 floats in, one float out**. `tanh` keeps the output between −1 and +1 for finite inputs.

Here and below, the float blocks listed for a call are ordered bottom to top. Each parameter declaration binds the current top block; elements inside that block keep their order. `demoHash` is a demonstration placeholder, not a computed content hash.

```text
W24tinyNet_demoHashMBlok
	C21 weightsW
	C3 xyzW
	C4 hiddenL
	sumL

	C4 Loop
		hJ
		Ch C4 JJimulC C3 JJiaddC J_weights_M sumV
		C3 Loop
			kJ
			Asum Ck J_xyz_M
			Ch C4 JJimulC Ck JJiaddC J_weights_M
			WWmulM WWaddM sumV
		Pool
		Asum WtanhM Ch JW_hidden_
	Pool

	C20 J_weights_M sumV
	C4 Loop
		hJ
		Asum Ch J_hidden_M
		C16 Ch JJiaddC J_weights_M
		WWmulM WWaddM sumV
	Pool
	Asum WtanhM
Kolb
```

The loops do ordinary multiply/add arithmetic. `C4 Loop hJ` means four executions with a fresh readonly integer `h` each time. Nothing here allocates a neuralnet object while sampling the field.

The four hidden rows occupy weights 0–15. Each row has three coordinate weights and a bias. Weights 16–19 connect the hidden neurons to the output; weight 20 is the output bias.

To use this with a sphere, a species can return a field of this mathematical form:

```text
field = 1 - dot(localXYZ,localXYZ) + strength*tinyNet(localXYZ,weights)
```

At `strength=0`, its zero set is the unit sphere; its numeric field is 1-radiusSquared rather than 1-radius. A small positive strength makes smooth bumps and dents. Because the neural output stays in [−1,+1], any positive part of this example field lies within radius `sqrt(1+abs(strength))`. This gives you a useful bound when configuring the species' bounding sphere. Apply the tutorial's compact-support rule before summing this contribution with other waves; the raw quadratic expression alone is not a globally supported contribution.

Coordinates and parameters are different roles at the Bellsack boundary: the sampler supplies XYZ anew at each queried point; the wave supplies the 21 weight Vars and any strength parameter. The function itself just receives numbers. It does not read a global Var tree.

**Try it and predict it.** Set all 21 weights to zero: the neural output is exactly zero, so the sphere receives no deformation. Set only weight 20 to 1: the neural output is approximately `0.761594`, independent of position. That changes the sphere's radius uniformly. To make a position-dependent effect, you need a path of nonzero weights from a coordinate through a hidden neuron to the output.

The neural calculation has 16 multiplies, 16 adds and five tanh evaluations, excluding loads, stores and calling overhead. These are arithmetic counts, not claims that tanh costs one hardware FLOP. More neurons increase cost on every density query. A small network is a sensible first experiment; a large LSTM belongs in a much less frequently evaluated game rule unless measurements justify putting it in density.

## 15. Recurrence without hidden state

A recurrent network uses its previous outputs as inputs to another step. It does not require mutable state hidden in a function.

This example has four states, a 4×4 matrix, four biases, and three time steps. Every destination neuron sees the **same old four states**. Only when all four new states are ready do we copy the new vector back.

The function takes `initial[4],weights[20]` and returns four floats. It uses two local arrays of length four: `state` and `next`.

```text
W24rnn4ThreeSteps_demoHashMMMMBlok
	C20 weightsW
	C4 initialW
	C4 stateL
	C4 nextL
	sumL

	C4 Loop
		iJ
		Ci J_initial_M Ci JW_state_
	Pool

	C3 Loop
		timeJ
		C4 Loop
			toJ
			Cto C5 JJimulC C4 JJiaddC J_weights_M sumV
			C4 Loop
				fromJ
				Asum Cfrom J_state_M
				Cto C5 JJimulC Cfrom JJiaddC J_weights_M
				WWmulM WWaddM sumV
			Pool
			Asum WtanhM Cto JW_next_
		Pool
		C4 Loop
			iJ
			Ci J_next_M Ci JW_state_
		Pool
	Pool

	C4 Loop
		iJ
		Ci J_state_M
	Pool
Kolb
```

`state` and `next` are the double buffer. If you wrote directly into `state` while calculating the destination neurons, later neurons would see some already updated values. That is a different recurrence, and its answer can depend on neuron order.

The integer `time` is read only and need not be used. The scalar `sum` is mutable local float scratch. These are different kinds of state: changing `sum` during one call does not make the public function impure.

For three steps, this calculation performs 48 multiplies, 48 adds and 12 tanh evaluations. That excludes initial copying and the 12 state-copy writes after the steps.

**Try it and predict it.** Give the matrix ones on its diagonal, zeros elsewhere, and zero biases. Start at `[1,0,0,0]`. Three steps return approximately `[0.566270,0,0,0]`, because the first component becomes `tanh(tanh(tanh(1)))`.

There are two useful ways to use this recurrence:

- **A density calculation:** build a small initial vector from sample XYZ and selected parameters, run exactly three steps, then reduce the result to one field value. Each queried point starts from its own explicit initial vector. It does not inherit the previous pixel's scratch state.
- **A game controller:** call one update per chosen simulation tick, save the returned vector in the appropriate Vars, and pass it back on the next tick. Now the game intentionally has memory, while the update function remains pure.

Doing several recurrent steps inside one density evaluation is not the same as advancing the world's clock several times. Keep this distinction visible in the editor.

## 16. A connection can also be a mathematical rule

A shape says where material is. A potential says which parameter configurations are preferred. They can be separate pure functions attached to related game content.

For a spring connecting two 3D points, a familiar energy is:

```text
energy = 0.5*stiffness*(distance(A,B)-restLength)^2
```

Here is a complete helper, taking ax,ay,az,bx,by,bz,restLength,stiffness:

```text
W8springEnergy_demoHashMBlok
	stiffnessW restLengthW
	bzW byW bxW
	azW ayW axW
	errorL
	Max Mbx WWsubM
	May Mby WWsubM
	Maz Mbz WWsubM
	WWWlength3_demoHashM MrestLength WWsubM errorV
	M0.5 Mstiffness WWmulM
	Aerror Aerror WWmulM WWmulM
Kolb
```

When the endpoints are restLength apart, the energy is zero. A nonnegative stiffness makes departures cost energy. A potential-based engine can use a negative gradient to accelerate the parameter Vars. The helper itself does not move a ball or write a wave.

If endpoints coincide, Euclidean length has a direction singularity; if a rule needs a smooth gradient there, choose a regularized distance deliberately. Do not confuse a pure function with an automatically stable physical system.

An equality loss such as `(heightA-heightB)^2` could be consumed by a constraint solver, but that is a different engine operation from applying spring acceleration. Stak returns numbers; the chosen density, potential, constraint or transition adapter supplies their role. A proposed diffeq adapter likewise needs a defined order for its derivative outputs.

**Creator exercise:** Start with a straight bridge and two anchor triples. Give its curve parameter a preferred value coupled to their separation. Then copy the bridge and join only one endpoint's X to another component. Can you explain which scalar values are shared and which rule sees them? Spatial proximity of two rendered curves alone should not establish that answer.

If two function input slots alias the same physical Var, physics differentiation must account for both occurrences. For example, `a-b` is identically zero when a and b are the same Var. Perturbing only one copied slot would give the wrong physical derivative. This belongs in the engine's binding/gradient handling, not in each author's spring formula.

## 17. Mandelbulb: a numerical program made of small functions

This is the first deliberately demanding geometry example. It uses the power-eight Mandelbulb recurrence: start an orbit at zero, repeatedly apply a spherical power-eight transform and add the queried point. We use eight iterations. [Daniel White's Mandelbulb account](https://www.skytopia.com/project/fractal/mandelbulb.html) describes the spherical-power construction.

First learn a two-output function. A complex number is a pair (real,imaginary). Multiplication takes four floats and returns two:

```text
WWWWcomplexMul_demoHashMMBlok
	biW brW aiW arW
	Mar Mbr WWmulM Mai Mbi WWmulM WWsubM
	Mar Mbi WWmulM Mai Mbr WWmulM WWaddM
Kolb
```

For (1+2i)*(3+4i), the result is (-5,10). The real result is pushed first, the imaginary result second. A caller storing two scalar locals therefore writes `imagV realV`.

Squaring the pair three times raises it to power eight. On a unit pair `(cos(angle),sin(angle))`, that multiplies the angle by eight:

```text
WWcomplexPower8_demoHashMMBlok
	inputImagW inputRealW
	realL imagL
	MinputReal realV MinputImag imagV
	C3 Loop
		squareIndexJ
		Areal Aimag Areal Aimag WWWWcomplexMul_demoHashMM
		imagV realV
	Pool
	Areal Aimag
Kolb
```

The full three-dimensional helper uses this for the polar and azimuthal angles. It multiplies the radius by itself to produce radius^8. This algebra avoids needing atan(0,0) at the origin:

```text
WWWbulbPower8_demoHashMMMBlok
	zW yW xW
	radiusL planarL safeRadiusL safePlanarL
	radius8L polarCosL polarSinL azimuthCosL azimuthSinL
	Mx My Mz WWWlength3_demoHashM radiusV
	Mx My WWlength2_demoHashM planarV
	Aradius M0.000000000001 WWmaxM safeRadiusV
	Aplanar M0.000000000001 WWmaxM safePlanarV
	Aradius Aradius WWmulM radius8V
	Aradius8 Aradius8 WWmulM radius8V
	Aradius8 Aradius8 WWmulM radius8V
	Mz AsafeRadius WWdivM Aplanar AsafeRadius WWdivM
	WWcomplexPower8_demoHashMM polarSinV polarCosV
	Mx AsafePlanar WWdivM My AsafePlanar WWdivM
	WWcomplexPower8_demoHashMM azimuthSinV azimuthCosV
	Aradius8 ApolarSin WWmulM AazimuthCos WWmulM
	Aradius8 ApolarSin WWmulM AazimuthSin WWmulM
	Aradius8 ApolarCos WWmulM
Kolb
```

This is one conceptual vector result, but its return width is three floats. The minimum denominators are a declared numerical convention: they slightly change the formula very near the origin or polar axis. Assume a finite bounded local sampling domain, such as [-2,2]^3.

Now the actual eight-iteration escape field:

```text
WWWmandelbulb8_demoHashMBlok
	zW yW xW
	orbitXL orbitYL orbitZL
	nextXL nextYL nextZL
	radiusL maximumRadiusL scaleL
	M0 orbitXV M0 orbitYV M0 orbitZV M0 maximumRadiusV
	C8 Loop
		iterationJ
		AorbitX AorbitY AorbitZ WWWbulbPower8_demoHashMMM
		nextZV nextYV nextXV
		AnextX Mx WWaddM nextXV
		AnextY My WWaddM nextYV
		AnextZ Mz WWaddM nextZV
		AnextX AnextY AnextZ WWWlength3_demoHashM radiusV
		AmaximumRadius Aradius WWmaxM maximumRadiusV
		M1 M2 Aradius M0.000000000001 WWmaxM WWdivM WWminM scaleV
		AnextX Ascale WWmulM orbitXV
		AnextY Ascale WWmulM orbitYV
		AnextZ Ascale WWmulM orbitZV
	Pool
	M2 AmaximumRadius WWsubM
Kolb
```

The function returns `2-maximumRadius`. Positive means that none of those eight orbit samples escaped radius2. This is a **finite escape field**, not the infinite set itself and not a signed distance estimator.

Why the scale? A conventional implementation can stop iterating once the orbit escapes. Our source has fixed loops and no if/break. We first remember the escape in maximumRadius, then limit the orbit radius to2 before the next power calculation. This leaves every pre-escape step unchanged and stops later exterior values from exploding through repeated eighth powers. Remembering the maximum prevents later clipping from pretending that an escaped point was inside again.

The exact values of the exterior field differ from a usual distance estimator. Max/min also introduce nonsmooth points. A visually recognizable Mandelbulb and a field that behaves well under the game's particular gradient and surface-search methods are separate tests.

**Try:** At the origin, the orbit stays zero and the returned field is2. At (2,0,0), a subsequent iterate escapes. Now change the iteration count from8 to6: fine details change and per-sample work decreases. Do not change a live integer loop binding to do it; edit the constant/size definition.

This example shows the cost of the language honestly: a familiar formula expands into named scalar calculations. Reusable vector helpers can hide that implementation from most creators. The compiler can later recognize intact groups without ever counting their three components as one memory slot.

## 18. Functions as things players can exchange

Once a helper is useful, another creator should be able to refer to that exact definition.

```text
WWWlength3_demoHashM
```

The friendly portion says what it probably does. The content hash identifies which exact version it is. An editor can display `length3` while retaining the complete canonical reference underneath. Copying canonical text must preserve the dependency, even if the friendly view hides it.

Functions remain isolated. A library helper cannot inspect the caller's variable named radius just because both authors chose that spelling. It must take radius as an input. This is what makes a component portable between a bridge, a puzzle machine and another person's game.

### What must be settled before real hashes are used

The intended rule is to hash the function with its own hash field blanked, including its human prefix and its exact dependency references. A production design also needs one documented treatment of whitespace/comments and a language/primitive-version identity. Changing what an opcode means must not silently change a published function's behavior under an unchanged hash.

Friendly aliases are resolved before establishing that canonical identity. The initial dependency graph should be acyclic; this tutorial has loops but no recursive calls. A cycle is an error, not an invitation to use unbounded recursion in a shader.

The exact token grammar is also unfinished. Arity markers and arbitrary user/hash characters can overlap. The parser needs fixed boundaries or explicit naming restrictions; it cannot merely strip every leading W and trailing M and hope it guessed correctly. The examples avoid that ambiguity; they do not solve the grammar.

GLSL names cannot simply receive every source character. In particular, replacing `$` with `_` loses information when both characters are already legal in source names. A derived collision-free symbol table or a reversible escape scheme can generate backend names without changing source identity. That generated table is a compiler cache, not a new persistent Var layout.

**Exercise:** Publish a length helper, then change sqrt into a squared result. Is it still the same function? It may have the same friendly label, but it needs a different identity and behavior description. Existing worlds must continue to refer to the old one unless edited.

## 19. Count the things that actually cost something

Stak should expose several separate numbers. A single `.size()` cannot honestly stand for all of them.

| Measurement | Unit | Example |
| --- | --- | --- |
| Input width | scalar float/int slots, separately | xyz is 3 float inputs |
| Output width | scalar slots | an LSTM cell returns 2 floats |
| Declared locals | scalar slots | two arrays of 4 plus sum = 9 floats |
| Peak evaluation stack | simultaneously live scalar values | includes waiting caller operands |
| Peak call-frame storage | live parameters, locals, operands across nested calls | not just the deepest helper's locals |
| Logical arithmetic work | counts by operation category | multiply, add, tanh |
| Logical data movement | loads/stores or transferred scalar slots | copying next[4] to state[4] |
| Engine work | invocations × work per invocation | every ray/physics probe calling density |

A vec3 occupies three float slots even when represented as one GLSL vector. A mat4 would occupy sixteen. Counting vector *values* as one can be useful for an editor display but must not leak into array strides, Var counts or stack capacity.

For `M2 M3 WWaddM`, the arithmetic count is one addition. Under your requested convention that a literal load costs one logical work unit, its simple work score is three: two loads plus the addition. That does not claim three GPU arithmetic instructions.

For `length3`, count three multiplications, two additions and one sqrt, plus the chosen load/binding costs. Keep sqrt/tanh/sin visible as special operations or give them an explicitly named cost model. Hardware cost depends on lowering and the target.

For a fixed loop, calculate its body cost and multiply by its count; add setup/finalization separately. For a function call, add the callee's cost and any actual argument/result movement your model includes. **Do not multiply every array read by the array's whole capacity.** Reading one element of a 506-element array is one indexed read. Copying the whole array is 506 logical transfers.

Logical allocation does not imply every declared slot occupies a unique GPU register forever. Conversely, an optimizer reusing storage does not change how many logical inputs the function has. Report an optimized estimate separately from the source's logical requirements.

A compiler can cache resource summaries for functions in an acyclic dependency graph. The same helper called twice contributes twice its execution work. Deep call reuse can still describe enormous total work. Counting compact source lines is not a runtime limit.

With Q and integer-dependent shapes, these summaries become formulas or checked bounds. For the tiny generic neuron below, work grows with N and its logical float input width is `2*N+1`. Not every possible future integer program will admit such a compact formula. An initial implementation can accept a deliberately small set of size expressions.

### What actually goes into JavaScript and GLSL?

The source's stack is a semantic model. A backend may keep a real shared float stack with checked frames. It may also turn known stack slots into local scalar variables or use vectors where components stay together. These are compatible implementation choices if they preserve the same results, isolation and rounding contract.

For the sphere helper, a scalar lowering could look like:

```glsl
float sphere(float x,float y,float z,float radius){
	return radius-sqrt(x*x+y*y+z*z);
}
```

```js
function sphere(x,y,z,radius){
	return radius-Math.sqrt(x*x+y*y+z*z);
}
```

These snippets show mathematical lowering, not strict float32 equivalence. JavaScript Numbers retain double precision unless rounded; float-stack writes round to float32. Decide where Stak rounds before optimizing those writes away. Tiny differences also matter to finite-difference gradients, so tolerances need to match the physics application.

If literal runtime push/pop is preferred, addition could instead be sequenced explicitly:

```js
function WWaddM(){
	const b=Stak[--sp];
	const a=Stak[--sp];
	Stak[sp++]=a+b;
}
```

The compiled caller owns a proved-valid frame and stack capacity. `&63` alone is not a proof: wrapping an overflow can overwrite another live value. A large tape cannot live in a 64-float total storage area simply because the arithmetic helper needs two operands.

GLSL ES 3.00 requires native array extents that satisfy its constant-expression rules. A source-level readonly loop index is not a compile-time constant array size. The language also does not allow recursive shader calls. These backend constraints are documented in the [GLSL ES specification, sections 4.1.9, 4.3.3 and 6.1.1](https://registry.khronos.org/OpenGL/specs/es/3.0/GLSL_ES_Specification_3.00.pdf).

There is no measured universal “2× slower” price for Stak. The earlier estimate is a hypothesis to test. A small register-friendly kernel and a large dynamically indexed private array can behave very differently. A density-bound frame also multiplies the cost by its sample count. Source-level absence of if/else does not prove the generated machine code has no branches.

## 20. A family of differently sized functions

So far the counts in the function names are fixed. Now consider a neuron that can read N states and N+1 weights, with the last weight serving as its bias.

```text
JQneuron_demoHashMBlok
	nodesJ
	Cnodes Jiadd1C withBiasJ
	CwithBias weightsW
	Cnodes statesW
	sumL
	Cnodes J_weights_M sumV
	Cnodes Loop
		fromJ
		Asum Cfrom J_states_M Cfrom J_weights_M
		WWmulM WWaddM sumV
	Pool
	Asum WtanhM
Kolb
```

The function receives one integer N, then the state block and weight block. N>=1 for this example. Q means the float input count varies with that integer. The final M means it always returns one float.

| N | State floats | Weights including bias | Total float inputs |
| ---: | ---: | ---: | ---: |
| 1 | 1 | 2 | 3 |
| 4 | 4 | 5 | 9 |
| 22 | 22 | 23 | 45 |

Q does **not** mean consume arbitrary remaining values from the caller. The declaration prefix determines `2*N+1` float inputs; the call frame must enforce exactly that ownership.

Here is a fixed 4-input-neuron wrapper:

```text
W9neuron4_demoHashMBlok
	C9 inputsW
	C4
	C9 Loop
		slotJ
		Cslot J_inputs_M
	Pool
	JQneuron_demoHashM
Kolb
```

It has a fixed species-friendly interface, while sharing the generic helper's source. The generated compiler can specialize that helper for N=4. This is a practical way to use generic code without varying the number of Ed Vars every time physics changes a float.

Changing N in a species definition changes its scalar layout. The editor must show which old parameter slots survive and which are added/removed. This is an explicit code/layout edit, not a continuously sliding `.p` that secretly changes GPU array sizes.

**Future extension:** integer parameters may also vary at runtime. Q is the reserved notation for the resulting float widths; implementing it needs bounded frame allocation, size arithmetic, and a clear resource contract. A compiler that has not implemented those rules must report a targeted TODO error. Do not claim generic runtime allocation exists merely because a backend can evaluate a selected N.

### Variable-size data structures have several meanings

| What varies? | Example | Required mechanism |
| --- | --- | --- |
| Size selected when compiling | network with 4 or 22 nodes | specialization and fixed arrays |
| Used length within fixed capacity | 17 occupied slots in a 128-slot tape | explicit length plus checked access rules |
| Logical values returned per call | prefix of a generated sequence | Q result contract, or fixed result plus length |
| Actual storage capacity per call | scratch array sized by runtime N | future bounded runtime allocation |

Arrays of vectors need no new address freedom: eleven vec3s still use 33 slots. A tree, graph, list or neural tape can also be encoded in a bounded array, but integer links need typed ownership/range rules. Do not quietly allow an arbitrary float to become a pointer. Such a conversion is outside the basic dialect taught here.

## 21. LSTM: separate remembering from producing an output

A plain recurrent neuron often forgets or amplifies its previous state rapidly. An LSTM supplies gates controlling what to retain and what to add.

First learn the cell update separately from the matrix that produces its gates. It takes four raw gate values and the previous cell value:

```text
inputGate = sigmoid(rawInputGate)
forgetGate = sigmoid(rawForgetGate)
outputGate = sigmoid(rawOutputGate)
candidate = tanh(rawCandidate)

newCell = forgetGate*oldCell + inputGate*candidate
newHidden = outputGate*tanh(newCell)
```

This helper is **five floats in, two floats out**:

```text
W5lstmCell_demoHashMMBlok
	oldCellW
	rawCandidateW
	rawOutputGateW
	rawForgetGateW
	rawInputGateW
	newCellL

	MrawForgetGate WsigmoidM MoldCell WWmulM
	MrawInputGate WsigmoidM MrawCandidate WtanhM WWmulM
	WWaddM newCellV

	MrawOutputGate WsigmoidM AnewCell WtanhM WWmulM
	AnewCell
Kolb
```

The two returned floats are `newHidden,newCell` in that order. They remain separate values; there is no runtime two-element object implied by the source syntax.

**Try it and predict it.** With all raw gates zero and `oldCell=2`, each sigmoid is 0.5 and the candidate is zero. The result is approximately `[0.380797,1]`. This is a useful example of why zero gates do not mean zero output.

Here is a complete one-cell recurrent controller. It has one external input, one old hidden value, one old cell value, and twelve weights. Each of its four rows calculates:

```text
rawGate = weightX*externalInput + weightH*oldHidden + bias
```

It then calls the helper above. The function is **15 floats in, two floats out**:

```text
W15lstmOne_demoHashMMBlok
	C12 weightsW
	oldCellW
	oldHiddenW
	externalInputW
	C4 gatesL
	sumL

	C4 Loop
		gateJ
		Cgate C3 JJimulC C2 JJiaddC J_weights_M sumV
		Asum MexternalInput Cgate C3 JJimulC J_weights_M
		WWmulM WWaddM sumV
		Asum MoldHidden Cgate C3 JJimulC C1 JJiaddC J_weights_M
		WWmulM WWaddM sumV
		Asum Cgate JW_gates_
	Pool

	C4 Loop
		gateJ
		Cgate J_gates_M
	Pool
	MoldCell W5lstmCell_demoHashMM
Kolb
```

The controller's `oldHidden` affects its gate values. Its `oldCell` participates in the cell update. Returning both new values is what allows the next call to reproduce the intended recurrence.

For N cells and D external input values, each gate row reads D external values plus N old hidden values, plus its bias. There are four rows per cell:

```text
weightCount = 4*N*(D+N+1)
stateCount = 2*N
```

All N cells must read the old hidden vector, just as all four neurons did in the double-buffer example. A full update returns `newHidden[N],newCell[N]`. The one-cell case above is N=1,D=1, which gives twelve weights and two state floats.

Potential level content includes a two-cell latch that remembers which pressure plate was touched, a four-cell controller that coordinates moving platforms, or a small learned predictor that estimates which chute the balls will take. These are examples of behavior a creator could tune or train; simply naming a function “LSTM” does not make the behavior emerge automatically.


The original LSTM work motivates gated memory; this tutorial uses the common forget-gate cell equations stated explicitly above. The code and its parameter count define the exact variant here. [Hochreiter and Schmidhuber, Long Short-Term Memory](https://www.bioinf.jku.at/publications/older/2604.pdf).

## 22. Neural tape and larger pure machines

The companion program supplies a full worked example with N LSTM cells, a 128-location tape, sixteen floats at each location, and one read head plus one write head. Its complete definitions are included in Appendix B and the downloadable source bundle, so this tutorial is self-contained.

The tape is a flat array of 2048 floats. Location j, component k is at index `16*j+k`. With `0<=j<128` and `0<=k<16`, the largest address is `16*127+15=2047`. This is bounded indexing within a named array; no raw pointer escapes into another function's storage.

The heads are distributions of 128 nonnegative floats whose sum is approximately one. A read returns the weighted combination of the 128 symbols. A write can erase components and add new ones:

```text
read[k] = sum(readHead[j]*tape[16*j+k])
newTape[16*j+k] = tape[16*j+k]*(1-writeHead[j]*erase[k])
                 + writeHead[j]*add[k]
```

The example's address helper compares content, interpolates with the previous location, shifts left/stay/right around a circular tape, and sharpens the resulting distribution. These are the differentiable memory operations in [Neural Turing Machines, sections 3.1–3.3](https://arxiv.org/html/1410.5401v2). A fixed tape is finite memory; calling it a neural Turing machine does not give it an infinite tape or guarantee learned algorithms.

The program computes both addresses using the old tape, then writes the new tape. The next controller step reads the new tape at the returned read address. This declared order matters, just as the RNN's double-buffer order matters.

Each controller gate sees external input[16], the previous tape read[16], and oldHidden[N]. Its head/control projection produces 76 numbers: two 22-float addressing controls, sixteen erase controls and sixteen add controls. That gives:

| Data | Number of floats |
| --- | ---: |
| LSTM weights and biases | `4*N*(N+33)` |
| Head/control projection weights and biases | `76*(N+1)` |
| All weights | `4*N*N+208*N+76` |
| Hidden plus cell state | `2*N` |
| Tape | `2048` |
| Two head distributions | `256` |
| All recurrent state | `2*N+2304` |

At N=22, the machine has 6588 weights and 2348 state floats. This is useful for demonstrating the language's reach. It is much larger than the four-neuron deformation and is not a suggested per-ray-step density network. Even N=1 retains the tape's 2048 floats and the addressing work over all 128 locations. Reducing only the controller width does not remove the tape cost.

A creator could use a small machine once per world tick to control many simpler geometric species. The renderer would receive the resulting positions or shape parameters, instead of replaying the entire machine for every sample along every ray.

### Deciding when variable size is really necessary

Consider this function name from the tape example:

```text
JQntmStep_demoHashQ
```

The leading J means one integer input, N. The leading Q means that the float-input count depends on N. The final Q means that the float-output count depends on N. Q does not mean “read the stack until empty.” The function's size contract says exactly how many inputs and outputs belong to this call.

With `P(N)=4*N*N+208*N+76` and `S(N)=2*N+2304`, one step takes P(N) weights, sixteen external inputs and S(N) state floats. It returns S(N) state floats. At N=22 that is 8952 float inputs and 2348 outputs.

There are two different implementation cases:

1. **N is chosen when compiling a species.** A creator selects N=4 or N=22. The compiler resolves all formulas, specializes the helper and knows every array extent before generating GLSL. The outer species has fixed Var counts. This is the practical first version to build.
2. **N changes between calls without recompiling.** Q expresses the intended variable count, but the runtime needs bounded input/frame storage, checked size arithmetic and a resource limit that applies to every permitted N. A native GLSL local array cannot simply be declared with an arbitrary runtime length. The language design must supply a fixed-capacity representation or another bounded lowering. This remains future compiler work; the tutorial does not imply that writing Q has implemented it.

A runtime “variable-length structure” can also have a fixed capacity and an explicit logical length. For example, a 128-slot tape can contain a list using only its first 17 slots. Storage capacity and current occupancy are separate facts. That representation avoids variable allocation but still needs rules for which integer values may control access.

The same discipline applies to shared user functions: a caller can share the hash of a generic helper, then specialize it to a fixed shape. The helper never reaches into a caller's local names. It receives all required integer sizes and float values through its public interface.

### Choosing the weights

A forward neuralnet is already game content if its weights create a useful shape or controller. Training is a method of choosing those weights.

For a scalar neural field, one supervised example can use:

```text
prediction = field(sampleXYZ,weights)
loss = (prediction-target)*(prediction-target)
```

A multi-example loss adds those terms and any desired smooth regularization. The training coordinates and targets are supplied as readonly inputs. The engine holds them fixed while changing weight Vars. Nothing about the word “readonly” prevents another function invocation from receiving different values; it only prevents this call from rewriting its inputs.

In Bellsack this loss could be a potential-like rule evaluated much less frequently than density. Its gradient can adjust the selected weight Vars. A controller can likewise be trained by unrolling a fixed number of steps and measuring how its outputs compare with a target. The language itself does not imply that automatic differentiation, backpropagation through time or a successful optimizer already exists. A finite-difference engine pays for repeated evaluations of the forward calculation.

Before using a neural function as game content, the human review questions are concrete:

- Can I account for every input Var and every returned value? Which are editable weights, sampled coordinates, external signals and carried state?
- Does the next-state code read only old state until every destination is calculated?
- Does repeating a call with the same complete inputs reproduce its outputs, independent of earlier calls?
- Does every array access have a range argument, including bias rows and flattened matrix strides?
- Is the network running once per game tick, once per potential evaluation, or at every density sample? Did I measure the cost at that frequency?
- Can I explain the useful behavior by changing a few weights or by giving a specific training objective?

If the answer to the final question is no, begin with the tiny network and a surface you can recognize. The large machine demonstrates expressiveness; the small one lets a level creator understand cause and effect.
## 23. What advanced Bellsack levels could be made from

These are possible projects, not a prediction of what the community will prefer five years from now. Each starts from the small helpers you have already learned.

| Project | Geometry | Less-frequent behavior | What players can understand |
| --- | --- | --- | --- |
| Sine-grown marble channels | tube plus 3–6 ripple pairs | spring energy couples nearby knobs | changing one band opens one route |
| A bridge that bends under a swarm | bounded bridge field | anchors and curvature coupled through physics | loading one side lowers a passage |
| A ring lock | torus with controlled gap | one-cell LSTM remembers a plate sequence | the ring remembers a previous action |
| A learned terrain gate | sphere plus 4-neuron deformation | loss fits a few designer-selected samples | examples become bumps and openings |
| Fractal obstacle garden | localized finite Mandelbulb fields | simple moving centers/parameters | fine geometry creates strategic routes |
| A distributed logic puzzle | cheap pieces with scalar/XYZ hands | pure transitions or constraints connect pieces | following wires explains dependencies |
| A tape-driven world machine | cheap geometry driven by returned controls | bounded neural tape once per chosen tick | player actions write a shared memory |

The expensive controller does not have to run at every terrain query. Compute its outputs at the chosen simulation rate, commit the intended Vars, and let many cheap density functions observe the resulting snapshot. A pure function does not choose that scheduling policy; Bellsack does.

A swarm's weight and velocity can affect selected Vars through physics. Those Vars can reshape the density that the swarm moves on. This feedback is the game. A density function that secretly updates state while being queried would make the feedback depend on rendering order, which is a different and usually confusing system.

For a creator, the most valuable shared helper may be “keep this bridge between these points” or “remember the last three switches,” not a general-purpose neural tape. Hide implementation detail in a reusable function only after its inputs, outputs and cost are understandable.

## 24. Is this better than Apjs or Sak?

Being able to express an LSTM proves useful expressiveness. It does not prove that ordinary content authors will enjoy the syntax or that its compiler is simpler overall.

Compare the same mathematical body with the same assumed parameters. These are expression-level comparisons, not claims that the exact displayed Apjs version has been run through its current parser.

| Intent | Stak body | Nested mathematical/Ap-style body | JavaScript body |
| --- | --- | --- | --- |
| sphere | `Mradius Mx My Mz WWWlength3_demoHashM WWsubM` | `(- radius (length3 x y z))` | `radius-Math.hypot(x,y,z)` |
| spring error squared | `Adistance Mrest WWsubM errorV Aerror Aerror WWmulM` | `(** (- distance rest) 2)` | `(distance-rest)**2` |

Count declarations, bindings and helper definitions on both sides when comparing whole programs. The table deliberately isolates only the mathematical body. Stak is often more verbose at that level. Its possible payoff is predictable stack effects, isolated calls, scalar layout and resource checking.

| Choice | Existing strength / proposed benefit | Cost that remains |
| --- | --- | --- |
| Improve Apjs | familiar nested expressions and existing array/loop machinery | separate overloaded size accounting and repair compiler boundaries |
| Use Sak/JavaScript for authoring | familiar operators, tools and scalar expressions | unrestricted JS is not automatically a sandboxable GPU language |
| Build Stak | explicit interfaces and a restricted pure execution model | new syntax, parser, diagnostics, optimizer and integration work |
| Use Stak underneath another authoring view | one checked core with friendlier expressions or graphical blocks | frontend translation and source/debug correspondence |

Hash sharing and pure functions do not uniquely require postfix notation. You can choose them while still questioning whether every player should type W/M/J/C markers. Conversely, readable postfix source can be useful to expert creators even if most players use sliders, imported components and a short-name editor view.

**My recommendation is to treat Stak as a promising core and an unproven primary authoring language.** Keep Apjs/Sak available while a small Stak experiment answers the questions below. Do not make an engine-wide replacement the price of finding out.

### A fair human trial

1. Without looking at the answer, alter the torus so its tube gets thicker without moving the tube centerline. Identify the affected parameter and bound.
2. Add a fourth amplitude/phase pair without leaving a mismatched array count or loop count.
3. Change the tiny RNN from three steps to two and explain why that does not change its number of weight Vars.
4. Read a deliberately out-of-range access and correct it from the compiler's explanation.
5. Come back tomorrow and explain one function written today, including stack order and scalar input width.

If those actions require constant mental decoding of the letters, shorten the authoring view before adding more language features. If the explicit effects make debugging easier, keep them visible. The test is your ability to change and reuse game behavior, not memorization of this book.

### A fair implementation trial

Build only enough compiler to demonstrate one scalar helper, a nested call, a bounded torus contribution, one array loop and the tiny RNN. Inspect generated JS and GLSL. Measure them in representative density sampling and less-frequent rule calls. Verify frame isolation and float32 behavior. Then decide the next increment with a human watching.

That trial can establish whether the chosen stack lowering is good enough. It cannot establish every Q/runtime-memory feature, and it should not silently add wave liveness fields, arbitrary P$Layout JSON, new persistence systems, or multiplayer/editor rewrites just to make a demo run.

## 25. What remains deliberately undecided

This tutorial has exposed specific design questions rather than concealing them:

- **Authoring ergonomics:** scalar bindings, L for local allocation, indexed operation spelling, friendly views, and bulk parameter/result transfers.
- **Lexical grammar:** exact boundaries around arity counts, friendly names, hashes and Blok; reserved name rules.
- **Numeric contract:** float32 rounding boundaries, valid domains, errors, and whether additional comparison/select primitives belong in the core.
- **Generic interfaces:** the accepted size-expression language, Q contracts, specialization identity and runtime capacity rules.
- **Species adapter:** exact query-input convention, compact support, parameter order/defaults, and aggregate density behavior.
- **Code identity:** canonicalization, dependency/version hashes and collision-free backend naming.

They are separable. You can dislike one spelling without rejecting the pure-function architecture, or like the architecture without committing to dynamic-size data structures in the first release.

## Appendix A. Token card and reading mistakes

| You see | Read it as |
| --- | --- |
| `M2`, `M-2`, `M1e-3` | Push a float literal |
| `Mx` | Read readonly scalar parameter x |
| `xW` | Bind one float parameter |
| `sumL` | Reserve one uninitialized local float |
| `Asum`, `sumV` | Read/write that local |
| `C22`, `Cnodes`, `nodesJ` | Integer literal/read/immutable binding |
| `JJimulC` | Consume two ints, produce their product |
| `C6 valuesW` | Bind six readonly input floats as values |
| `C6 nextL` | Reserve six local floats |
| `Cindex J_values_M` | Read one named-array element |
| `M7 Cindex JW_next_` | Write local element index with float7 |
| `Ccount Loop indexJ ... Pool` | Fixed/size-derived repetition with a fresh immutable index |
| `WWWlength3_demoHashM` | A 3-float-input,1-float-output call |
| `W24tinyNet_demoHashMBlok ... Kolb` | Define a 24→1 function |
| `JQneuron_demoHashM` | Future/generic1-int interface with size-dependent float input count |

The most common mistakes are reversing subtraction, binding scalar parameters in the caller's order, reading a local before initializing it, reusing a callee's local name as though it were visible, mixing an extent with a current index, and forgetting that a whole-block binding preserves component order.

The current tutorial primitive vocabulary includes add/sub/mul/div/min/max, abs/sqrt/sin/exp/log/tanh/sigmoid/softplus, and the integer operations shown. The neural-tape appendix uses stable softplus `max(x,0)+log(1+exp(-abs(x)))` and modulo with nonnegative operands. The supplied CPU prototype rounds values stored on the float stream, in float locals and after float primitives to float32. JavaScript transcendental functions and GPU implementations can still differ numerically; use tolerances when comparing them.

`WWWW` means four floats, W5 means five. J/C are the corresponding integer input/output markers. Q replaces a variable float arity; it is not an unrestricted varargs escape. Arity counts must agree with checked execution; neither a user-supplied name nor a friendly editor label is proof.

## Appendix B. Complete advanced tape program

This is the complete example reached by the advanced chapters: variable-width LSTM,128×16 circular tape,one read head,one write head,all helpers,and a fixed22-cell five-step wrapper. The primitive and array conventions are exactly those taught above. Fake hashes are placeholders. There are no implicit external neural helper definitions.


```text
// Demonstration hashes are placeholders, not verified content hashes.
// Parameter blocks bind from the top of the float stack without reversing
// the order of the elements inside each block.
// J_name_M reads element at the top integer index and pushes one float.
// JW_name_ consumes one integer index and one float, writing a local element.
// WsoftplusM is the stable primitive max(x,0)+log(1+exp(-abs(x))).
// WlogM is natural logarithm. Softmax requires nodes>=1 and finite logits.

JQsoftmax_demoHashQBlok
	nodesJ
	Cnodes valuesW
	Cnodes expsL
	maximumL
	totalL
	valueL

	C0 J_values_M maximumV
	Cnodes Loop
		iJ
		Amaximum Ci J_values_M WWmaxM maximumV
	Pool
	M0 totalV
	Cnodes Loop
		iJ
		Ci J_values_M Amaximum WWsubM WexpM valueV
		Avalue Ci JW_exps_
		Atotal Avalue WWaddM totalV
	Pool
	Cnodes Loop
		iJ
		Ci J_exps_M Atotal WWdivM
	Pool
Kolb

// Float argument order: tape[2048], previousHead[128], parameters[22].
// parameters: key[0..15], rawBeta[16], rawGate[17], rawShift[18..20],
// rawGamma[21]. Shift slots mean displacements -1,0,+1 respectively.
W2198addressHead_demoHashM128Blok
	C22 parametersW
	C128 previousHeadW
	C2048 tapeW
	C128 scoresL
	C128 contentL
	C128 blendedL
	C3 shiftsL
	keyNormL
	tapeNormL
	dotL
	valueL
	betaL
	gateL
	gammaL

	C16 J_parameters_M WsoftplusM M0.000001 WWaddM betaV
	C17 J_parameters_M WsigmoidM gateV
	C21 J_parameters_M WsoftplusM M1 WWaddM gammaV
	M0 keyNormV
	C16 Loop
		kJ
		Ck J_parameters_M valueV
		AkeyNorm Avalue Avalue WWmulM WWaddM keyNormV
	Pool
	AkeyNorm M0.000000000001 WWaddM WsqrtM keyNormV

	C128 Loop
		jJ
		M0 tapeNormV
		M0 dotV
		C16 Loop
			kJ
			Cj C16 JJimulC Ck JJiaddC J_tape_M valueV
			AtapeNorm Avalue Avalue WWmulM WWaddM tapeNormV
			Adot Avalue Ck J_parameters_M WWmulM WWaddM dotV
		Pool
		Abeta Adot WWmulM
		AkeyNorm AtapeNorm M0.000000000001 WWaddM WsqrtM WWmulM
		WWdivM Cj JW_scores_
	Pool
	C128 Loop
		jJ
		Cj J_scores_M
	Pool
	C128 JQsoftmax_demoHashQ
	C128 Loop
		jJ
		C127 Cj JJisubC JW_content_
	Pool

	C3 Loop
		kJ
		C18 Ck JJiaddC J_parameters_M
	Pool
	C3 JQsoftmax_demoHashQ
	C3 Loop
		kJ
		C2 Ck JJisubC JW_shifts_
	Pool

	C128 Loop
		jJ
		Agate Cj J_content_M WWmulM
		M1 Agate WWsubM Cj J_previousHead_M WWmulM
		WWaddM Cj JW_blended_
	Pool

	C128 Loop
		jJ
		C0 J_shifts_M Cj C1 JJiaddC C128 JJimodC J_blended_M WWmulM
		C1 J_shifts_M Cj J_blended_M WWmulM WWaddM
		C2 J_shifts_M Cj C127 JJiaddC C128 JJimodC J_blended_M WWmulM WWaddM
		M1e-30 WWmaxM WlogM Agamma WWmulM Cj JW_scores_
	Pool
	C128 Loop
		jJ
		Cj J_scores_M
	Pool
	C128 JQsoftmax_demoHashQ
Kolb

// Float argument order: tape[2048], readHead[128].
// Returns one weighted read symbol, components 0 through 15.
W2176readTape_demoHashM16Blok
	C128 readHeadW
	C2048 tapeW
	totalL

	C16 Loop
		kJ
		M0 totalV
		C128 Loop
			jJ
			Atotal Cj J_readHead_M
			Cj C16 JJimulC Ck JJiaddC J_tape_M
			WWmulM WWaddM totalV
		Pool
		Atotal
	Pool
Kolb

// Float argument order: tape[2048], writeHead[128], rawErase[16], rawAdd[16].
// Applies sigmoid to erase and tanh to add here, exactly once per component.
// Returns a new tape in ascending slot/component order; the input is unchanged.
W2208writeTape_demoHashM2048Blok
	C16 rawAddW
	C16 rawEraseW
	C128 writeHeadW
	C2048 tapeW
	C16 eraseL
	C16 addL
	weightL

	C16 Loop
		kJ
		Ck J_rawErase_M WsigmoidM Ck JW_erase_
		Ck J_rawAdd_M WtanhM Ck JW_add_
	Pool
	C128 Loop
		jJ
		Cj J_writeHead_M weightV
		C16 Loop
			kJ
			Cj C16 JJimulC Ck JJiaddC J_tape_M
			M1 Aweight Ck J_erase_M WWmulM WWsubM WWmulM
			Aweight Ck J_add_M WWmulM WWaddM
		Pool
	Pool
Kolb

// Example hashes are placeholders. Not executable in an existing Stak compiler.
// Logical float arguments below are ordered bottom-to-top, each array ascending.
// Every call has its own parameter/local namespace.

// Integers: width,rows. Floats: values[width],weights[rows*(width+1)].
// Each weight row ends with its bias. Returns rows affine results.
JJQaffine_demoHashQBlok
	rowsJ widthJ
	Cwidth Jiadd1C strideJ
	Crows Cstride JJimulC countJ
	Ccount weightsW
	Cwidth valuesW
	sumL

	Crows Loop
		rowJ
		Crow Cstride JJimulC Cwidth JJiaddC J_weights_M sumV
		Cwidth Loop
			columnJ
			Asum
			Ccolumn J_values_M
			Crow Cstride JJimulC Ccolumn JJiaddC J_weights_M
			WWmulM WWaddM sumV
		Pool
		Asum
	Pool
Kolb

// Integer: nodes. Floats: weights,input[16],read[16],hidden[nodes],cell[nodes].
// Gate row 4*node+0=input, +1=forget, +2=output, +3=candidate.
// Returns newHidden[nodes],newCell[nodes]. All nodes use the OLD hidden vector.
JQlstm_demoHashQBlok
	nodesJ
	Cnodes C32 JJiaddC widthJ
	Cnodes C4 JJimulC gatesJ
	Cwidth Jiadd1C Cgates JJimulC countJ
	Cnodes cellW
	Cnodes hiddenW
	C16 readW
	C16 inputW
	Ccount weightsW
	Cgates zL
	Cnodes newHiddenL
	Cnodes newCellL
	currentCellL

	Cwidth Cgates
	C16 Loop inputIndexJ CinputIndex J_input_M Pool
	C16 Loop readIndexJ CreadIndex J_read_M Pool
	Cnodes Loop hiddenIndexJ ChiddenIndex J_hidden_M Pool
	Ccount Loop weightIndexJ CweightIndex J_weights_M Pool
	JJQaffine_demoHashQ
	Cgates Loop
		gateResultJ
		Cgates C1 JJisubC CgateResult JJisubC JW_z_
	Pool

	Cnodes Loop
		nodeJ
		Cnode C4 JJimulC C1 JJiaddC J_z_M WsigmoidM
		Cnode J_cell_M WWmulM
		Cnode C4 JJimulC J_z_M WsigmoidM
		Cnode C4 JJimulC C3 JJiaddC J_z_M WtanhM
		WWmulM WWaddM currentCellV
		AcurrentCell Cnode JW_newCell_
		Cnode C4 JJimulC C2 JJiaddC J_z_M WsigmoidM
		AcurrentCell WtanhM WWmulM Cnode JW_newHidden_
	Pool

	Cnodes Loop outHiddenJ CoutHidden J_newHidden_M Pool
	Cnodes Loop outCellJ CoutCell J_newCell_M Pool
Kolb

// Integer: nodes.
// Floats: weights[P],input[16],hidden[nodes],cell[nodes],tape[2048],
//         readHead[128],writeHead[128]. P=4*nodes*(nodes+33)+76*(nodes+1).
// Returns newHidden,newCell,newTape,newReadHead,newWriteHead in that order.
// The 76 interface values are read controls[22],write controls[22],
// raw erase[16],raw add[16]. Both heads address the OLD tape.
JQntmStep_demoHashQBlok
	nodesJ
	Cnodes C33 JJiaddC Cnodes JJimulC C4 JJimulC lstmCountJ
	Cnodes Jiadd1C C76 JJimulC interfaceCountJ
	ClstmCount CinterfaceCount JJiaddC parameterCountJ
	C128 oldWriteW
	C128 oldReadW
	C2048 oldTapeW
	Cnodes oldCellW
	Cnodes oldHiddenW
	C16 inputW
	CparameterCount weightsW
	C16 readL
	Cnodes newHiddenL
	Cnodes newCellL
	C76 controlsL
	C128 newReadL
	C128 newWriteL
	C2048 newTapeL

	// The previous head reads the previous tape for this controller step.
	C2048 Loop tapeReadIndexJ CtapeReadIndex J_oldTape_M Pool
	C128 Loop oldReadIndexJ ColdReadIndex J_oldRead_M Pool
	W2176readTape_demoHashM16
	C16 Loop readResultJ C15 CreadResult JJisubC JW_read_ Pool

	// Update the whole LSTM synchronously.
	Cnodes
	ClstmCount Loop lstmWeightIndexJ ClstmWeightIndex J_weights_M Pool
	C16 Loop inputIndexJ CinputIndex J_input_M Pool
	C16 Loop readIndexJ CreadIndex J_read_M Pool
	Cnodes Loop oldHiddenIndexJ ColdHiddenIndex J_oldHidden_M Pool
	Cnodes Loop oldCellIndexJ ColdCellIndex J_oldCell_M Pool
	JQlstm_demoHashQ
	Cnodes Loop cellResultJ Cnodes C1 JJisubC CcellResult JJisubC JW_newCell_ Pool
	Cnodes Loop hiddenResultJ Cnodes C1 JJisubC ChiddenResult JJisubC JW_newHidden_ Pool

	// Project the new hidden vector to all read/write interface controls.
	Cnodes C76
	Cnodes Loop newHiddenIndexJ CnewHiddenIndex J_newHidden_M Pool
	CinterfaceCount Loop
		interfaceWeightIndexJ
		ClstmCount CinterfaceWeightIndex JJiaddC J_weights_M
	Pool
	JJQaffine_demoHashQ
	C76 Loop controlResultJ C75 CcontrolResult JJisubC JW_controls_ Pool

	// Read address: content lookup, interpolation, circular shift, sharpening.
	C2048 Loop tapeForReadHeadJ CtapeForReadHead J_oldTape_M Pool
	C128 Loop previousReadJ CpreviousRead J_oldRead_M Pool
	C22 Loop readControlJ CreadControl J_controls_M Pool
	W2198addressHead_demoHashM128
	C128 Loop newReadResultJ C127 CnewReadResult JJisubC JW_newRead_ Pool

	// Write address uses its own previous position and controls.
	C2048 Loop tapeForWriteHeadJ CtapeForWriteHead J_oldTape_M Pool
	C128 Loop previousWriteJ CpreviousWrite J_oldWrite_M Pool
	C22 Loop writeControlJ C22 CwriteControl JJiaddC J_controls_M Pool
	W2198addressHead_demoHashM128
	C128 Loop newWriteResultJ C127 CnewWriteResult JJisubC JW_newWrite_ Pool

	// Erase/add write, with per-component learned controls.
	C2048 Loop tapeForWriteJ CtapeForWrite J_oldTape_M Pool
	C128 Loop writeLocationJ CwriteLocation J_newWrite_M Pool
	C16 Loop eraseControlJ C44 CeraseControl JJiaddC J_controls_M Pool
	C16 Loop addControlJ C60 CaddControl JJiaddC J_controls_M Pool
	W2208writeTape_demoHashM2048
	C2048 Loop newTapeResultJ C2047 CnewTapeResult JJisubC JW_newTape_ Pool

	// Explicit recurrent state. No persistent data is hidden in scratch.
	Cnodes Loop returnHiddenJ CreturnHidden J_newHidden_M Pool
	Cnodes Loop returnCellJ CreturnCell J_newCell_M Pool
	C2048 Loop returnTapeJ CreturnTape J_newTape_M Pool
	C128 Loop returnReadJ CreturnRead J_newRead_M Pool
	C128 Loop returnWriteJ CreturnWrite J_newWrite_M Pool
Kolb

// Fixed FIVE recurrent steps, with a different external input16 each step.
// Integer: nodes. Floats: weights[P],inputs[80],initial state S[nodes].
// Returns final state S[nodes]; caller chooses whether to retain it or discard it.
JQntmFiveSteps_demoHashQBlok
	nodesJ
	Cnodes C33 JJiaddC Cnodes JJimulC C4 JJimulC lstmCountJ
	Cnodes Jiadd1C C76 JJimulC interfaceCountJ
	ClstmCount CinterfaceCount JJiaddC parameterCountJ
	Cnodes C2 JJimulC C2304 JJiaddC stateCountJ
	CstateCount initialW
	C80 inputsW
	CparameterCount weightsW
	CstateCount stateL

	CstateCount Loop
		initialIndexJ
		CinitialIndex J_initial_M CinitialIndex JW_state_
	Pool
	C5 Loop
		timeJ
		Cnodes
		CparameterCount Loop weightIndexJ CweightIndex J_weights_M Pool
		C16 Loop
			inputIndexJ
			Ctime C16 JJimulC CinputIndex JJiaddC J_inputs_M
		Pool
		CstateCount Loop stateIndexJ CstateIndex J_state_M Pool
		JQntmStep_demoHashQ
		CstateCount Loop
			resultIndexJ
			CstateCount C1 JJisubC CresultIndex JJisubC JW_state_
		Pool
	Pool
	CstateCount Loop finalIndexJ CfinalIndex J_state_M Pool
Kolb

// Example fixed interface for 22 LSTM cells: 6588 weights+80 inputs+2348 state.
// This is a vector-valued pure machine; a Bellsack density wrapper would still
// have to choose/derive one scalar density from its outputs explicitly.
W9016ntm22_demoHashM2348Blok
	C9016 inputsW
	C22
	C9016 Loop slotJ Cslot J_inputs_M Pool
	JQntmFiveSteps_demoHashQ
Kolb
```

## Appendix C. What was checked, and what this does not prove

During the earlier tutorial-design stage, the arithmetic examples were evaluated with an isolated-frame,float32 scratch interpreter of the proposed dialect. The current downloadable implementation replaces that execution path with generated JavaScript functions; see the accompanying validation report for current backend checks. Geometry was compared with independent equations: sphere/cube/torus sample cases,1,000 algebraic power-eight comparisons plus axes/origin,and500 finite Mandelbulb escape comparisons. Neural examples had90 random comparisons with separate equations. The NTM example was checked at1,3,22 LSTM cells; its five-step wrapper matched separately chained calls.

The interpreter checked local initialization,index bounds,readonly parameter writes,integer binding discipline and frame consumption for those executions. This is execution-based validation of the examples, not a general static proof engine. It does not establish a correct future GLSL compiler,all floating-point edge cases,learning success,GPU limits or a universal performance ratio.

The accompanying `.stak.txt` file contains all complete function definitions from this tutorial, including the tape appendix. Scalar bindings have been corrected to consume caller-supplied inputs without redundant C1 tokens. Snippets that merely call a function or illustrate a stack are not standalone definitions. Read the documented argument order before compiling and invoking a function.

The HTML edition of this tutorial is an offline reader. Open the separate `Stak-playground.html` to run code, run CPU tests and generate GLSL. Its optional GPU tests need Lamgl installed in the same page; Lamgl is not bundled. Neither page is a Bellsack engine.
