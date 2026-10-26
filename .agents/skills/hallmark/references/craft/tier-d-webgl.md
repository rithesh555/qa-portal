## Tier D · Three.js / WebGL / shaders

**When justified.** The 3D is the hero value: a product the visitor turns in their hands, an interactive playground, a generative piece the cursor steers.

**When not.** A static spinning thing the visitor cannot touch. A bloom-heavy shader background that "looks premium". A 5 MB model loaded eagerly on a marketing page.

**Performance budget.**
- Under 100 draw calls
- Under 2 MB of JS and assets in total
- Under 6s to load
- 60fps on a mid-range phone

**Stack.**
- React Three Fiber for React projects, about 30 KB on top of Three.js
- Vanilla [Three.js](https://threejs.org) otherwise, 100 to 300 KB depending on features
- Models: glTF 2.0 with Draco compression
- Textures: KTX2 / Basis, far smaller than PNG or JPEG

**Always a non-WebGL fallback.** When the canvas fails to initialise (no WebGL2, a blocklisted GPU, low-power mode), show a static poster so the page still renders and still reads.

**Motion.** The scene moves when the visitor moves it. Any idle motion is a loop under `craft.md` § 5: the render loop stops under reduced motion and off-screen, and past 5 seconds it carries a visible pause control.

### Anti-patterns of WebGL

- **Three.js for a stationary product.** No interaction, no justification; an SVG or a photograph.
- **Bloom and glow overdose.** Three or four post-processing passes that blur everything. One effect, barely visible (29).
- **A 5 MB model loaded eagerly.** Lazy-load the geometry and show the poster while it streams.
- **No fallback.** A page that is blank without WebGL has failed accessibility.
- **Generic procedural-noise shaders.** The look of every demo. A custom shader earns its place; off-the-shelf Perlin noise rarely does.
