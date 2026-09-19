2026-9-19 Bellsack is my opensource/Apache2 video game engine. The following was written about a slightly newer version than Bellsack0575.17 which reduced number of multiprobes per ball to 17 to make it about 30% faster and a few other small changes. It was output by GPT-6-Pro. I (Ben F Rayfield) read the whole thing and it seems mostly accurate. Some of the equations are not the way I think about them but are likely still true, just algebra transforms of them. This document explains how lamglLoopBodyB works which does physics and graphics of Bellsack.

**`lamglLoopBodyB` is a CPU-managed pipeline that asks the GPU questions about the world, then uses the answers to update the Vars and draw the next image.** The shared shader is one reusable component of that pipeline, not the whole engine.

The key distinction is between **finding a contact point**, **estimating how that contact changes when world parameters change**, and **applying the resulting impulse**. Those are three different calculations, with different optimizations.

I traced the uploaded **`Bellsack0575(20260918-233648).html`**, including the shared Zoo shader and your restored 17 probes. Running checkbox values can differ from the file’s defaults.

I also made two reference documents:

**[Detailed execution guide](sandbox:/mnt/data/Bellsack0575_LoopB_executionGuide_byGPTPro_2026-9-18.md)** · **[Searchable, line-numbered source inspector](sandbox:/mnt/data/Bellsack0575_LoopB_executionGuide_byGPTPro_2026-9-18_source.html)** · **[Complete bundle](sandbox:/mnt/data/Bellsack0575_LoopB_executionGuide_byGPTPro_2026-9-18_bundle.zip)**

The source inspector displays the original code without executing it. Its function links are a conservative static index, not a claim that every optional helper runs every frame. **Your game HTML is unchanged.**

# 1. The complete frame, before going into the details

The normal path is:

```text
renderLoop
	measure dt
	update inputs, actions, camera, editor

	lamglLoopBody
		consume initial boot-pause calls
		select A or B

		lamglLoopBodyB
			physics2
				select nearby balls
				group balls into groups of 32
				find terrain waves for each group
				pack and upload their parameters

				GPU: nearest-surface searches, several starts per ball
				GPU: choose one winning result per ball
				GPU: sample signed distance under parameter perturbations
				GPU: pack the useful scalar results
				GPU → CPU: read those results

				CPU: terrain/ball impulses
				CPU: ball–ball collisions
				CPU: gravity
				integrate Vars

			mid3
				reapply held editor state
				read camera and image dimensions

			graphics4
				build graphics shards
				pack and upload terrain parameters
				GPU: terrain raymarch, four depth-band passes
				GPU: shade and combine terrain hits
				GPU: render balls
				optional editor overlays and picking
				display

			end5
				release temporary GPU tensor leases
```

That ordering is important: **graphics normally sees the world after the current physics update**. The main physics pipeline requests its final readback before applying impulses; this is not currently a fully asynchronous, one-frame-delayed simulation.  

The function names containing `Demo`, `Todo`, or `Bell5` are not reliable indicators of whether code is obsolete. Several such functions are directly used by production B.

# 2. The different things called “state,” “cache,” and “shader”

These distinctions explain much of the architecture.

A **Var** stores a scalar value and its motion-related fields. A **wave** is an instance with several such scalar parameters. A **species** supplies the function interpreting those parameters. A **Zoo** is a set of species whose code is compiled together.

A **shard** is a selection of wave instances needed for a group of calculations. Different shards can use the same Zoo and therefore the same shader program, while containing different wave values and counts. The layout generator derives the field order from the species declaration; the density wrapper supplies the instance data and weighting. 

A **Lamgl Tensor** is a handle to GPU storage. For example:

```text
sh:[14,32,4]
```

means fourteen rows, thirty-two texels per row, four float channels per texel. It is not fourteen by thirty-two by four independent shader threads.

A **program** is compiled code. A **draw** runs that program over an output tensor. The same program can run many draws.

**Sharing the graphics and physics program does not share their private arrays across draws.** Each invocation creates its own private `Vec[]`, loads its selected data, performs its samples, and finishes.

### The fourth float means different things in different places

| Value                                  | Meaning of `.w`                        |
| -------------------------------------- | -------------------------------------- |
| `densityAtXYZI` input                  | Packed shard/perturbation selector `I` |
| Nearest-search result, `ballCacheVec4` | Ranking score                          |
| Mode-5 output                          | Signed distance including ball radius  |
| Graphics terrain hit                   | Packed shard ID and normal angles      |
| RGBD image                             | Camera distance/depth                  |
| `ballXYZC`                             | Packed ball color                      |

In particular, **`ballCacheVec4.w` is not signed distance**, and **a graphics hit’s `.w` is not yet depth**. The shared sampler deliberately returns different formats for the modes; later helpers interpret them.   

# 3. How execution gets into B

`renderLoop` computes elapsed seconds and clamps `dt` to the range 0–0.2. It updates gamepad input, keyboard/gamepad mapping, raw cursor input, actions, and camera state before calling the numerical frame. It schedules the next callback with either `requestAnimationFrame` or the alternate one-millisecond timeout.   

`lamglLoopBody` performs the initial boot-pause gate and selects A or B. Once in B, there are separate controls for:

* Pausing B.
* Doing physics at all.
* Running the main physics path rather than the older demo.
* Allowing the computed physics to move Vars.

**“Don’t apply motion” is not equivalent to “don’t calculate physics.”** B can still perform the expensive searches and readback while suppressing changes. That is why a benchmark with motion disabled does not necessarily represent the moving game. 

The ordinary B entry runs **one main physics pipeline per B call**. It does not wrap that pipeline in the older `physicsCyclesPerVideoFrame` loop.

After impulses, the integration route depends on `IsNewEventSystemY2025M11`: either directly integrate the relevant Vars or mark them dirty and process the VarVM queue. This gate is separate from the main numerical physics calculation. 

# 4. What the terrain actually is

For a sampled point \(x\), the density wrapper effectively computes:

$$
D(x)=D_{\text{background}}+
\sum_{\text{included waves }w}
w.p\;F_{\operatorname{species}(w)}(x,\operatorname{parameters}(w)).
$$

The optional Z-floor contribution can also be inserted.

The zero surface of this sum is the terrain. The code treats positive density as inside when assigning the signed-distance sign.

**It is a sum of contributions, not “pick whichever individual shape is closest.”** Positive and negative wave weights both matter. Omitting a wave can change the surface formed by several other waves.

The wrapper checks each wave’s bounding sphere before invoking its species function, and applies `wave.p` once outside that function. 

### How species code gets into a shader

`terrainSpecies()` finds the relevant GlDag roots with live wave instances. `terrainZoo()` forms the canonical species set. `Zoo.toGlsl()` gathers their reachable helper functions and emits shared dependencies once.

Currently, species selection is **room-wide**. The spatial shards select wave instances, but the engine is not yet choosing a different minimal nearby species set for every region of the room. 

### How a species’ parameters become wave fields

Every record starts with:

```text
X, Y, Z, R, wave.p
```

Then additional declared parameters follow.

`Sxyz` means the sample position, so it is supplied from the current XYZ scratch rather than stored separately for every wave. `Cxyz`, `Cxyzr`, and `R` reuse the existing center/radius fields. Other vectors and matrices flatten into scalar slots.

For example, a vector parameter named `Foo` can occupy `Foo`, `Foo1`, and `Foo2`.

The CPU and GLSL use the same derived layout. That is what makes this chain line up:

```text
Var object
	→ packed float position
	→ perturbation column
	→ returned signed-distance difference
	→ impulse applied to that Var
```

A mistake in that correspondence produces the wrong physics even when the shader compiles and the picture looks plausible. 

# 5. Selecting balls and constructing physics shards

The current default is 448 nearby balls, forming fourteen groups of thirty-two.

The nearest-ball search is camera-relative. The selection helper requires the expected count and a multiple of thirty-two rather than quietly handling a partial group.

Despite its name, **`kmeansGroupsOf32ForBalls` currently uses Morton ordering**, not a full k-means clustering solve. It makes spatial sorting keys from the coordinates, sorts, then divides the result into groups of thirty-two. Quantizing the sorting keys does not quantize the actual simulated coordinates.

The purpose is to put nearby balls together so their terrain subsets overlap, while giving the GPU a regular layout. Thirty-two is the chosen organization; it is not a portable promise about every GPU’s physical scheduling.

### Finding the waves for a group

For each group, B approximately constructs a sphere enclosing its balls. It also constructs a larger sphere enclosing the group spheres to help choose the initial terrain search.

It then filters wave candidates in two stages:

1. Wave sphere versus group sphere.
2. Wave sphere versus at least one ball sphere within that group.

Axis bounds reject obvious misses before doing the squared-distance test. Coordinate values are copied into temporary float32 arrays so these loops need not repeatedly navigate Var objects for every comparison.  

The resulting shard contains the **union** of waves selected for its thirty-two balls. One wave can appear in multiple shards.

**Important current-code detail:** the final filtering expressions use each `ball.R.p`. Older comments describe an enlarged `physicsBallBoundingRadius`, but that is not the radius being read in this loop. Consequently, this implementation does not establish that every distant probe excursion samples the complete global density field. The shader evaluates the selected shard’s field.  

Debug shard Vars and membership pointers are maintained only when the corresponding debug/ring options require them. They are not necessary GPU inputs.  

# 6. The texture row and your private-array cache

Each shard texture row contains:

```text
8 header floats:
	total used packet length
	7 species counts

4 XYZI scratch floats

wave records:
	species 1 records
	species 2 records
	...

up to 3 floats of packet-end alignment

any remaining reserved row space
```

The header values are stored in a float texture and converted into private integers.

**There is no per-wave or per-species rounding to four floats.** Only the complete used packet is rounded to a texel boundary. Waves with different parameter counts remain tightly packed. 

Physics still uses the old Bell5-named capacity calculation. At its default, that provides 320 wave-parameter slots plus four scratch slots.

That means “64” in the capacity option is effectively **64 times five floats**, not necessarily sixty-four arbitrary species instances.

If a whole wave record will not fit, `prepareDensityShardRow` skips it. Physics records the truncation and retains the accepted ordering. Graphics handles this differently by growing capacity before packing.

### What `I` selects

The density input is:

```glsl
vec4(sampleX,sampleY,sampleZ,I)
```

with:

```text
I = shardRow*4096 + parameterIndex
```

The high part selects the row; the low twelve bits select a private `Vec[]` element to perturb. Zero is used for neutral evaluation.

On the first density call in an invocation:

```text
read header texels
	→ LoopSize[]

read used parameter texels
	→ Vec[]

compute record offsets
	→ SpeciesStart[]

optionally add EPSILON to one private parameter
```

Then every subsequent XYZ sample reuses those arrays. **The perturbation does not modify the shared texture or the CPU Vars.** It modifies that invocation’s private copy. 

### What is and is not cached

The shader caches parameters, not the final density value. Calling it again at the same XYZ still evaluates the density loops; `xyzChanged` mainly avoids redundant scratch updates.

Also, the current guard remains:

```glsl
bool iChanged=!VecLoaded;
```

It does not compare the next `I` against the previous one.

That works for the current shared sampler because it preserves `from.w` throughout each invocation. It is **not** a general implementation of changing shards or perturbations midway through one invocation.  

# 7. The shared multimode shader

The shared program implements:

| Mode | Calculation                                   |
| ---: | --------------------------------------------- |
|    3 | Nearest-surface search                        |
|    5 | Signed-distance/parameter perturbation sample |
|    8 | Terrain raymarch                              |
|    9 | Direct density sample                         |

Each mode decides the next `sampleAt`. All modes then pass through:

```glsl
float densityValue=densityAtXYZI(sampleAt);
```

After that line, the selected mode consumes the answer, changes its phase or search state, and requests its next sample.

**One function definition, one written call site, many runtime evaluations.**

The little `float d[10]` stores density answers used by the numerical calculations. It does not hold copied wave records. 

The mode is uniform across a draw. Graphics and physics still have different draws and output shapes.

This arrangement is why we could reduce compiler expansion without replacing your data architecture.

# 8. Mode 3: what the “Newton loop” actually computes

This is the expensive search stage.

Each invocation receives:

```text
from.xyz = ball center
to.xyz   = starting search position
from.w   = shard selector
```

The state starts at `to`. Each probe independently tries to locate a useful surface point for that same ball.

## 8.1 Ten density evaluations per iteration

The shader uses four tetrahedral directions:

```text
v0 = ( 1, 1, 1)
v1 = (-1,-1, 1)
v2 = (-1, 1,-1)
v3 = ( 1,-1,-1)
```

For current search position \(x\), it samples:

$$
D\bigl(x+\epsilon(v_a+v_b)\bigr).
$$

There are sixteen ordered combinations, but only ten distinct positions because exchanging \(a\) and \(b\) gives the same position.

**The symmetric sample results are reused rather than evaluating those six duplicates again.**

Those ten values provide approximate densities and density gradients at four nearby observation points. A tetrahedral gradient from four values is:

$$
G(d_0,d_1,d_2,d_3)=
\frac{1}{4\epsilon}
\begin{pmatrix}
d_0-d_1-d_2+d_3\\
d_0-d_1+d_2-d_3\\
d_0+d_1-d_2-d_3
\end{pmatrix}.
$$

The implementation reconstructs the symmetric table, uses each row’s average for density, and each row’s tetrahedral difference for its gradient. 

## 8.2 The search objective is not merely density

At each observation point, the code combines:

$$
F=
|\text{estimated density}|
+
k\left(1-\left|\hat t\cdot\hat g\right|\right),
$$

where \(\hat t\) points toward the ball and \(\hat g\) is the normalized density gradient.

The first part favors the surface. The second favors a surface normal parallel or antiparallel to the direction toward the ball. 

That explains the “slight attract” name, but **it is not an ordinary spring pulling the point toward the ball**.

The geometric interpretation is that a smooth closest point should have its normal along the point-to-ball direction. This is a useful condition, not a guarantee of finding the global nearest point on a complicated surface. Multiple starting probes help with that ambiguity.

## 8.3 The update

From four nearby values of this merged objective, the shader estimates its gradient and applies a soft magnitude limiter.

It then does, algebraically:

$$
x_{\text{next}}
=
x-
s\,g\,
\frac{\overline F}{(\lVert g\rVert+10^{-9})^2},
$$

where \(s\) is `SignedDistanceSpeed`.

This is Newton-like root seeking along an estimated gradient. It is **not a full Hessian-based multidimensional Newton solve**.

The variable named `sd` at this point is the averaged merged objective, not the final ball-to-terrain signed distance. 

The normal loop runs its prescribed iteration count. `endItersEarly` subtracts from that count; it is not a convergence detector that automatically stops when a point is sufficiently good.

## 8.4 Final ranking

After the iterations, one final density sample produces:

$$
\text{score}
=
\lVert x-\text{ball}\rVert
+
\text{MultiprobeSortDensityMul}\,|D(x)|.
$$

The result is:

```text
vec4(candidateSurfaceXYZ,score)
```

A low score means a point is near the ball and has little density error. This avoids choosing an apparently close point that is still far from the actual zero surface. 

# 9. Seventeen starts, then one winner

Ordinary multiprobe mode uses the center plus eight cube corners at each of two scales. Your current scales are `ballRadius` and `3*ballRadius`, giving seventeen starts.

For \(G\) groups and \(P\) probes, the nearest-search tensor is:

```text
[G*P,32,4]
```

The horizontal coordinate selects the ball within its group. The vertical coordinate identifies the group and probe.

The CPU constructs the `from` and `to` tensors in that order. All probes for a ball use its center as `from`, while `to` changes with the starting offset. 

A separate small GPU merge shader reads all candidate results for each ball and retains the whole vec4 with the lowest score. That produces:

```text
[G,32,4]
```

This is the GPU `ballCacheVec4`.

Main physics deliberately passes `isReadback:false` to nearest search and merge. **The CPU does not normally receive every probe’s search result.** The winning tensor feeds directly into the next GPU stage. 

### The separate two-probe option

That option uses a previously stored `Ball.Phy.Surf` point plus one randomly selected configured center offset. Both counts currently must equal one.

The random offset selection occurs when constructing the plan, not independently inside each ball’s shader invocation. The winning surface points later have to be read back to update `Ball.Phy.Surf`.  

It is therefore a different search strategy with extra persistent-cache maintenance, not simply the same seventeen-start calculation magically made cheaper.

# 10. Mode 5: the major cached-contact optimization

This stage is easy to misunderstand because its name includes both signed distance and perturbation.

**It does not rerun the Newton search for every world parameter.**

Let:

* \(B\) be the ball center.
* \(S\) be the winning cached surface point.
* \(n=\operatorname{normalize}(B-S)\).

When that direction is zero, the implementation uses an upward fallback.

For one selected parameter configuration, it evaluates only:

$$
f_+=D(S+\epsilon n),\qquad
f_-=D(S-\epsilon n),\qquad
f_B=D(B).
$$

Then:

$$
g_n=\frac{f_+-f_-}{2\epsilon},
\qquad
f_{\text{mid}}=\frac{f_++f_-}{2}.
$$

The one-dimensional correction is:

$$
\text{slide}=-\frac{f_{\text{mid}}}{g_n},
$$

unless the derivative is too small, in which case slide is zero.

The refined point is:

$$
S'=S+n\,\text{slide}.
$$

Finally, density at the ball center determines inside versus outside, and the ball radius is subtracted:

$$
d=
\text{outsideSign}\,\lVert S'-B\rVert-r_{\text{ball}}.
$$

That is the returned `.w`. 

### Why this is so much cheaper

The full search might need hundreds of density evaluations. This local refinement needs three.

When evaluating a perturbed terrain parameter, the shader keeps the **same cached contact candidate \(S\)** and estimates how its nearby surface intersection changes.

That is a deliberate approximation. It works from the assumption that a small parameter perturbation can be handled locally around the cached contact rather than finding a completely different nearest feature.

This distinction is central:

```text
Expensive:
	find a nearest point from scratch for every perturbed world

Current:
	find a good point once
	reuse it for cheap local samples of each perturbed world
```

# 11. How parameter perturbations are arranged

For terrain impulses, each output row represents one ball. Columns represent different scalar perturbations.

With \(S\) reserved terrain-variable slots:

```text
0 .. S-1: perturb one terrain parameter
S:        perturb ball X
S+1:      perturb ball Y
S+2:      perturb ball Z
S+3:      spare column
S+4:      neutral, unperturbed sample
```

At the default \(S=320\), that gives:

```text
[448,325,4]
```

The output X coordinate selects the perturbation. Output Y selects the ball and its group. The shader forms the corresponding `I`, loads the shard, and adds epsilon to the selected private parameter. Ball-coordinate perturbations instead adjust `from.xyz`.  

### Correction to my earlier padding explanation

**Not every one of those 325 columns performs three density evaluations.**

The shader first reads the header and rejects out-of-used-range terrain columns and the explicit spare column. Those invocations return a sentinel **before reaching `densityAtXYZI`**. A few packet-alignment slots can remain inside the advertised used prefix. 

Therefore, shrinking the output rectangle could remove launch/output/packing/readback overhead, but it would not necessarily remove full density calculations in proportion to its area. My earlier description overstated that potential benefit.

### Another already-present optimization

The shard texture uploaded for the nearest search is retained and used by the signed-distance stage:

```js
shardTex.free(2)
```

That avoids uploading identical shard parameters twice in the same physics pipeline. Each invocation still fills its own private arrays. 

# 12. Why there is a packing shader before readback

Mode 5 returns:

```text
refinedX, refinedY, refinedZ, signedDistance
```

for every parameter sample.

But the full terrain impulse solver needs the **signed-distance scalar**, not every sample’s refined XYZ.

The packing helper gathers four `.w` values into the four channels of one output texel. At defaults:

```text
Before: [448,325,4]
After:  [448,82,4]
```

The last packed vec4 contains the neutral distance in its first channel and sentinels in the remaining channels. The preceding vec4 contains the ball-X/Y/Z perturbations and spare column. 

This reduces the readback from about **2.33 MB to 0.588 MB**, calculated from those shapes, while retaining float32 precision for every useful scalar.

The final `.get()` crosses from GPU to CPU.

**Its elapsed time may include all outstanding GPU work needed before that read can finish.** It is not automatically the execution time of mode 5 or the packing helper. That remains the correct interpretation of your screenshots. The implementation eventually calls `gl.readPixels` into a CPU float array.  

# 13. What the CPU terrain impulse solver does

Now the CPU has a neutral distance and nearby perturbed distances for each ball.

For parameter \(q_i\):

$$
J_i\approx\frac{d(q+\epsilon e_i)-d(q)}{\epsilon}.
$$

This is the local rate at which signed distance changes when that parameter changes.

**These derivatives are of the cached-contact approximation described above.** They are not derivatives obtained by independently converging a complete nearest-point solve for every parameter.

The solver ignores contacts whose neutral distance is not negative. For penetrating contacts, it computes the rate of signed-distance change:

$$
u=\sum_i J_i v_i.
$$

That sum includes the relevant terrain parameters and the ball’s three position coordinates.

It also computes:

$$
M=\sum_i a_i J_i^2,
$$

where \(a_i=\texttt{accelMul}_i\), acting as inverse mass in this calculation.

If \(u<0\), it applies:

$$
\alpha=-\frac{(1+e)u}{M},
\qquad
v_i'=v_i+\alpha a_iJ_i.
$$

Here the terrain-contact code uses \(e=1\). Very small or nonfinite denominators are skipped. 

### What this means physically in your model

A contact does not merely push a terrain object’s XYZ.

A radius, weight, or another shape parameter can receive velocity whenever changing it changes the contact’s signed distance.

That is the route by which a ball can push the **shape’s parameter space**, not a polygon vertex.

The impulse is normal to the constraint in the relevant parameter coordinates. No separate contact-friction calculation appears in this solver.

### Position recovery is separate

The current code also pushes the ball out by:

$$
\Delta B=-d\frac{J_B}{\lVert J_B\rVert}.
$$

That is the actual expression: it normalizes the ball-coordinate gradient and pushes by the penetration-distance magnitude.

This correction changes the ball position directly. It does not simultaneously project all terrain parameter positions. Terrain receives velocity changes and subsequently evolves through integration. 

### It is a sequential contact pass

Groups and balls are processed in randomized order. Later contacts see velocity updates from earlier contacts, but the sampled distances and Jacobians came from the earlier GPU snapshot.

So this is not a globally converged, simultaneous contact solve. The random ordering avoids a permanently fixed priority; it does not make order irrelevant.

# 14. How joined spider Vars affect the physics

Two packed parameter positions may represent the same effective joined scalar coordinate.

`spiderContactBindings` groups their columns under one representative. Their derivatives are added first:

$$
J_{\text{shared}}=J_1+J_2+\cdots
$$

and **then squared** for the inverse-mass denominator.

That matters. Treating each alias independently would give a different denominator and effectively introduce extra coordinates/mass merely because a scalar is displayed in several places.  

The resulting shared velocity is written to the group’s members. During integration, `spiderIntegrator` also ensures the representative integrates once, collects relevant accumulators, intersects temporary bounds, and copies representative state to aliases. Held editor coordinates use zero integration time. 

There are two distinct bookkeeping structures here:

```text
spiderIndex:
	which Vars are joined

spiderContactBindings:
	which columns in this particular shard
	belong to each joined coordinate
```

The first is cached but currently invalidated at the start of editor actions each frame. The second is reconstructed per shard.

My earlier statement that changing `.p` can never matter to the index was too broad: **a wave changing between zero and nonzero can change active membership**. Any future caching improvement must respect that, along with hand/type changes.

# 15. Ball–ball collision and gravity

After terrain contacts, B calls the older CPU ball–ball routine over a deduplicated list of selected balls.

It shuffles the order, examines pairs, tests squared center distance, and exchanges normal velocity components for approaching overlapping balls. It uses a common radius and equal-mass response, unlike the terrain solver’s general inverse-mass formula. Optional overlap recovery divides the separation equally.  

This remains an all-pairs candidate loop, but the screenshots do not establish it as the dominant cost.

### Another correction to an earlier explanation

The comment says each ball bounces at most once. **The implementation does not strictly guarantee that.**

It checks `!bounced[a]` before entering the inner loop. If a collision then sets `bounced[a]=true`, the inner loop continues without breaking or rechecking that flag. It still checks `bounced[b]`.

So an outer-loop ball can participate in another collision during that same inner loop. The comment expresses the intention, not the exact behavior.  

Finally, gravity adds to selected balls’ Y velocities, then the integration stage advances positions. The main pipeline explicitly orders terrain response, ball–ball response, and gravity in that sequence. 

# 16. Integration: turning velocity and forces into the next Var state

The impulse code is not the same thing as `Var.nextState`.

The current scalar integrator first adds the spring contribution:

$$
gr\mathrel{+}=(p-pr)\,ps.
$$

It calculates:

$$
p'=p+dt(v+dp-gp\,gr)
$$

and, when temporary bounds are consistent, clamps that position.

Velocity becomes:

$$
v'=\left(v+dt\,accelMul(dv-gr)\right)e^{-dt\,kv}.
$$

Then it commits the new values, resets temporary accumulators and bounds, and prepares `kv` from `cv+vv` for subsequent use. 

So several mechanisms coexist:

```text
contact impulse:
	directly changes velocity

penetration recovery:
	directly changes position

gravity:
	adds velocity

spring/gradient/integration:
	processed through Var.nextState
```

This is not currently “all effects are one scalar loss followed by one universal update.”

`nextState(0)` clears temporary inputs without doing its ordinary movement step. The code also retains a NaN-position recovery hack that can randomize a bad position before the `dt` check. 

# 17. Graphics shards: why there are eighty-five, but only four terrain draws

Graphics uses four forward-depth bands. Each successive band is tiled more finely across the screen:

```text
1×1  =  1 shard
2×2  =  4 shards
4×4  = 16 shards
8×8  = 64 shards
             ---
              85
```

Each tile combined with its near/far depth interval forms a frustum-like `BentCube`.

**Each pass still covers the image.** A pixel determines which tile’s shard row it should read for that depth band. Thus it is four full-image terrain draws, not eighty-five full-image draws. 

The broad culling test checks the wave sphere against the BentCube’s bounds and enclosing sphere. It expands the wave radius by `2*EPSILON` because normal sampling can reach slightly beyond the nominal ray/shard boundary.

The more precise intersection option currently defaults off because its CPU work is more expensive. Keeping conservative extra candidates is acceptable; dropping a necessary density contribution is not. 

### Graphics capacity differs from physics capacity

The graphics packer computes actual required parameter slots and grows its reserve in buckets. It then checks that every candidate wave survived packing.

Therefore the configured graphics capacity is a reserve, not permission to truncate the density sum. 

# 18. Why shared `VecSize` and the preflight exist

An array size is embedded in the GLSL source. A program declaring:

```glsl
float Vec[324];
```

is different source from one declaring:

```glsl
float Vec[516];
```

Even with identical mode logic, those would be separate programs.

The current shared capacity chooses a value sufficient for physics and graphics. It grows but does not immediately shrink when the scene becomes smaller.

Before physics first compiles a Zoo, `preflightSharedZooCapacity` examines initial graphics requirements. Otherwise physics might compile one capacity and graphics immediately require another. 

**The larger declaration does not mean every invocation loads all those floats.** The header still determines the used prefix to load.

The common capacity is also not a promise that one Zoo can never need recompilation. More crowded later content can require a larger declaration.

# 19. Mode 8: terrain raymarching through the same density function

For each pixel, the shader builds a normalized ray from camera forward/right/up and screen coordinates.

The pass bounds are expressed as **camera-forward depths**, not distances along every angled ray. The shader divides by the ray’s forward component to obtain its near and far ray parameters. 

The shared loop then runs four phases.

### Initial sample

It samples at the band’s near boundary. A density already within `closeEnuf` is accepted as a surface candidate.

### March

It advances until it finds a sign change, a close-enough value, the far boundary, or the march-count limit.

Fixed-step mode uses the configured step. Variable mode scales with absolute density but clamps the step to a small minimum and the configured maximum.

**The density is not assumed to be a true signed-distance field.** The code does not simply jump forward by an arbitrary density magnitude.

### Refinement

A sign change establishes a bracket. It performs six bisection samples, then interpolates within the final bracket using the endpoint density magnitudes.

### Normal

It evaluates four tetrahedral samples around the hit and estimates the gradient.

The overall work allowance is `MARCH_MAX_STEPS+11`: one initial sample, up to the march limit, six refinement samples, and four normal samples. A separate march counter preserves the original march limit. 

The returned XYZ is a world-space hit. Its fourth component packs the graphics shard ID and quantized normal angles.

# 20. Turning terrain hits into a picture, then drawing balls

The four terrain passes return hit tensors, not final RGB pictures.

`graphicsHitToRgbdPass` reads their hits, decodes the normals, produces the existing procedural coloring/grid, computes camera distance, and keeps the nearest result.

The resulting format is:

```text
red, green, blue, distance
```

This color operation does not choose one species as the owner of the summed isosurface.  

### Ball graphics is a separate calculation

The ball shader analytically ray-tests spheres. It does not call density or run Newton search.

For each pixel it currently loops over all selected balls, finds the nearest nonnegative intersection, reads that ball’s color, and compares its depth with terrain. 

Therefore these are three different workloads:

```text
CPU ball–ball collision
GPU ball–terrain contact
GPU pixel–ball rendering
```

Optimizing one does not automatically optimize the other two.

At 256×192 and 448 balls, the ball graphics loop nominally performs about **22 million pixel–ball candidate iterations**. Those are cheap sphere tests, not 22 million density searches, and that number alone is not a timing measurement.

# 21. Editor overlays and special picking

The normal graphics pipeline can add cursor rings, selected-wave outlines, sphere silhouettes, spider lines, and diagnostic voxels.

The CPU overlay path paints a compact image containing one packed value per pixel: fifteen color bits and nine depth bits. Four such values fit into the channels of one uploaded texel.

It then uses a GPU helper to expand that compact image into RGBD and another helper to depth-merge it with the world picture.

**It does not normally read the terrain picture back merely to paint the overlay.** It uses the picture’s dimensions and merges on the GPU.

That means overlay cost includes CPU projection/rasterization, the compact upload, expansion, and depth merge. Closing the DOM control panel is not necessarily disabling those separate geometry overlays.

There is also a special `prSurfaceDrag` hit-picking path. It reads one selected graphics hit back and constructs a CPU contact derivative for the drag tool. That helper is currently Bell5-only and rejects mixed-species shards. It is an optional editor feature, not a fallback implementation of normal B physics.

These branches are covered function-by-function in the downloadable guide and source inspector.

# 22. Lamgl underneath the entire pipeline

Every shader stage eventually reaches Lamgl.

There are two main forms:

```js
Lamgl(float32Array,shape)
```

uploads CPU data into a GPU tensor, while:

```js
Lamgl({
	sh:shape,
	sv:vertexSource,
	sf:fragmentSource,
	//Tensor and uniform inputs
})
```

runs a GPU program and returns output tensor handles.

The runtime resolves GLSL inputs and outputs, obtains output storage, gets the program, binds uniforms/textures, sets the framebuffer and viewport, draws, and returns handles.

It does not automatically read the outputs back.

## Program reuse

The important cache key is now the vertex/fragment source pair, **without output shape**. Buffer-related keys can still include shape. 

That is why the same Zoo program can produce:

```text
nearest:      [G*P,32,4]
perturbation: [N,S+5,4]
graphics:    [H,W,4]
```

A cache hit skips shader creation and linking. On a miss, Lamgl creates shaders, compiles, links, and checks status. 

The current implementation still has per-call JavaScript work: generating source, parsing declarations, constructing binding descriptors, and looking up uniforms. Cached GPU code does not imply zero CPU work around the draw.

## Tensor lifetimes

`fr` is a remaining-use counter.

```text
.free(1): set one future input use
.free(2): set two future input uses
.free(): release now
.get(): explicitly copy data to CPU
```

`.free(n)` sets the count; it does not add references.

When the count reaches zero, the tensor handle is invalidated and its underlying storage normally returns to a shape-keyed pool. Reusing a texture from that pool avoids repeatedly creating fresh GPU storage. 

This lifetime mechanism is why input ownership matters. Passing a tensor under multiple sampler names consumes multiple named uses; the shared wrapper balances the unused graphics-mode physics-sampler aliases accordingly.

These aliases do not copy the texture, and the graphics branch does not execute the physics-input fetches.

## Synchronization

Normal Lamgl execution does not force `finish()` after every draw. Your explicit profiling barriers can do additional synchronization around stages. 

A draw call returning to JavaScript means the output handle exists, not necessarily that the GPU has completed every operation.

A later `.get()` forces the dependency chain to become available to the CPU. Hence:

```text
small JavaScript submission time
	≠ small GPU execution time

large readPixels duration
	≠ that one shader's execution time
```

# 23. Display and cleanup

Ordinary display copies the final GPU texture to Lamgl’s canvas using a small GPU program. It does not require the CPU to inspect every pixel.

A full image readback occurs for explicit BMP output or the corresponding graphics-readback test option.

The image’s `.w` is depth rather than ordinary opacity, so the canvas path does not use it as the game’s alpha-blending model.

The graphics `finally` block releases temporary tensors even when later stages throw. Physics also keeps some most-recent tensors/data structures for inspection and subsequent use; their individual lifetime rules determine when their GPU storage is released.

The first display submission is where the historical boot log is completed. That is useful operationally, but it is not a direct measurement of when a physical monitor presented the image.

# 24. Which optimizations are already doing real work

There are several independent optimizations, not one giant “GPU optimization.”

**Spatial selection:** a density sample scans its shard’s wave records rather than all room instances.

**Private parameter reuse:** one invocation loads its shard once and reuses the arrays for many XYZ samples.

**Ten-sample symmetry:** mode 3 reuses equal sample positions rather than doing all sixteen ordered combinations.

**GPU winner selection:** multiple probe results are reduced to one point per ball without copying every result to CPU.

**Cached-contact approximation:** mode 5 takes three density samples instead of rerunning the complete nearest search per perturbed parameter.

**Shared physics upload:** nearest search and perturbation use the same shard texture.

**Scalar-packed readback:** CPU receives signed-distance scalars rather than XYZ-plus-distance for every parameter sample.

**Graphics culling and capacity buckets:** keep candidate sets local while avoiding recompilation on every count change.

**Program and texture reuse:** avoid repeated linking and memory allocation.

**Single density call site:** changes how the compiler sees the computation without reducing the mathematical sample count.

The supplied experiments demonstrated that the private-array version could coexist with fast compilation. The explanation about internal inlining/specialization remains an inference from measured source transformations, not an observed compiler trace. 

# 25. The useful workload numbers

For the source defaults of 448 balls, seventeen probes, thirty-two nearest-search iterations, and 256×192 graphics:

| Work                                       |                         Derived count |
| ------------------------------------------ | ------------------------------------: |
| Physics groups                             |                                    14 |
| Nearest-search invocations                 |                                 7,616 |
| Density evaluations per nearest invocation |                                   321 |
| Total nearest-stage density evaluations    |                             2,444,736 |
| Merged surface results                     |                             448 vec4s |
| Parameter-output invocations               | 145,600, including early-return lanes |
| Packed contact readback                    |                         587,776 bytes |
| Terrain graphics invocations               |            196,608 across four passes |
| Pixel–ball candidate iterations            |                            22,020,096 |
| Possible CPU ball pairs                    |                  100,128 before skips |

The nearest count comes from \(10K+1\), not an assumed fixed cost per iteration. The mode-5 rectangle includes cheap rejected lanes. The raymarch’s density-call count varies with hits and exit conditions. **These are counts derived from code, not timings or live values read from your tab.**   

# 26. What not to assume before editing

Several current limitations are especially relevant to understanding what you have.

**The Zoo header still supports seven species.** The larger goal is not implemented merely because an option permits a larger nominal count. Physics can truncate wave records to its parameter budget; graphics grows instead.  

**Fixed-I caching is not general changing-I caching.** The current modes satisfy the narrower condition, but the density function’s old general comments promise more than its guard implements.

**The scalar field is not an SDF.** Both nearest search and raymarching are numerical procedures over a density field. Their limits and approximations matter.

**The two-probe cache, private `Vec[]` cache, and merged GPU contact cache are different things.** Disabling one does not disable the other two.

**The existing async/skip switches are experiments, not free speedups.** In Lamgl’s `isSkipCompute` branch, an output handle may be returned without executing the requested draw. That handle is not proof of a valid new answer. 

**The deferred-readback checkbox is not a complete pipeline.** Main physics still explicitly requests the immediate readback. 

**Order is meaningful.** Changing candidate ordering can change truncation choices, floating-point summation order, or sequential collision priority. “Same mathematical set” does not automatically mean bit-identical execution.

**Caching spider membership requires tracking membership changes too**, not just explicit joins. Removing the unconditional invalidation without checking those paths would trade CPU cost for potentially stale physics.

---

The architecture to keep in your head is:

> **Vars define the world. Shards choose a local parameter snapshot. Mode 3 finds a contact candidate. Mode 5 cheaply asks how that contact changes under parameter perturbations. The CPU converts those changes into impulses, then integrates Vars. Graphics uses the updated world through the same density evaluator, but in separate draws.**

That is the current B design. The files linked above preserve the deeper helper-level walkthrough and the exact source behind it. No executable HTML changes or new GPU benchmarks were made for this explanation.
