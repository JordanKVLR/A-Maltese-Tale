# Ħarsi: Spirits of Malta, art style guide

Every Ħarsi and every person in the game is a hand-drawn SVG. This guide is the contract for
anyone drawing them: how they should look, and the technical rules that keep them working in
the game.

## The look we're after

Think official monster-collector key art: confident clean line art, cel shading with one or two
shadow tones and a crisp highlight, big readable silhouettes and real character appeal. What
makes ours different is that every design grows out of Malta:

- Limestone: honey-gold globigerina, weathered and pitted; the rubble walls of the fields.
- The sea: from turquoise shallows at Comino to the deep blue past Dingli.
- Luzzu boats: cobalt, canary yellow, red and green stripes, and the Eye of Osiris on the bow.
- Madum tiles, Maltese lace (bizzilla) and silver filigree, as patterns and accents.
- Megalithic temples, the Knights' armour and eight-pointed cross, festa banners, fireworks,
  bastions, cannon, carob trees, prickly pear, salt pans, the sirocco.

A good design reads from its silhouette alone, has one idea you can say in a sentence, and
tells you its type and its piece of Malta at a glance.

### Line

- Outline every shape. Use a **dark, rich version of that part's colour** (deep green on a
  green body, deep brown on stone), never pure black. Pupils may be near-black (`#1b1622`).
- **Outer silhouette: `stroke-width` 4 to 5.** Inner lines (overlaps, folds, armour plates):
  2 to 3. Tiny details: 1.5.
- Always `stroke-linejoin="round"` and `stroke-linecap="round"`.
- Draw the outline once, on top of the fills, so it stays crisp.

### Shading: the light comes from the top left

1. **Base:** a flat fill, or a gentle `linearGradient` from slightly lighter at the top left to the base colour.
2. **Shadow:** one darker shape inside each main form, along its lower-right side, about 20–30%
   darker and nudged towards blue or purple (not grey). Draw it as a path that follows the form
   (a crescent along the belly or under the jaw), or clip it with a `clipPath` of that form.
   A second, deeper accent shadow is welcome where forms overlap.
3. **Highlight:** a small light shape near the top left of rounded forms, plus a crisp white
   specular dot on glossy parts (eyes, shells, metal, wet skin).
4. **Rim light (optional):** a thin light stroke along the lower-right edge for depth.

No blur and no filters: the softness comes from gradients and shape design.

### Eyes

Eyes carry the appeal, so give them care: a clear shape, an iris with a radial gradient, a
large pupil, and **one big plus one small highlight** placed at the top left. Base forms get
big, warm, rounded eyes; final forms get sharper, more determined ones. Eyes must read at 40px.

### Colour

- Build a palette of one main hue, one secondary and one accent pop, with no more than five
  hues in all, not counting outline tones.
- The type colours below are a guide, not a rule. A Water/Steel Ħarsi might be gunmetal and
  cobalt with brass.

  | Type | Guide colour |
  | --- | --- |
  | Normal | `#b6b3a2` |
  | Fire | `#f0803c` |
  | Water | `#4a90e2` |
  | Grass | `#5fbb56` |
  | Electric | `#f5c542` |
  | Ice | `#86cfe8` |
  | Fighting | `#cf5a4a` |
  | Poison | `#a465b5` |
  | Ground | `#d4a857` |
  | Flying | `#93b8e8` |
  | Psychic | `#f0587f` |
  | Bug | `#96b93f` |
  | Rock | `#b8a067` |
  | Ghost | `#7c6bb0` |
  | Dragon | `#6b5ecf` |
  | Dark | `#5a5670` |
  | Steel | `#9aa7b5` |
  | Fairy | `#f29ccd` |

- Saturated, sunny and Mediterranean. Dark and Ghost designs are moody, not muddy: deep
  violets and teals with glowing accents.

### Evolution lines

The stages share a palette, a signature motif and the same eyes, so you can tell they're
family. Each stage is bigger, more detailed and more confident than the last:

- **Stage 1:** cute and round, with simple shapes and big eyes.
- **Stage 2:** leaner, the motif grows.
- **Final stage:** imposing, with armour, horns, ornament and a strong stance.

Legendaries are majestic and fill the frame.

## Framing (every Ħarsi)

- Draw in a **200 × 200 box** (`viewBox="0 0 200 200"`).
- **Pose:** a three-quarter view, **facing left** (the face turned towards the viewer's left). The
  game mirrors your own Ħarsi in battle so it faces the enemy.
- **Ground:** the feet stand on y ≈ 182. Every Ħarsi includes a ground shadow first:
  `<ellipse cx="100" cy="184" rx="…" ry="7" fill="#1d2b33" opacity="0.22"/>`, with `rx` to match
  its footprint. Flyers and floaters hover above it, with a smaller shadow.
- **Size shows power:**
  - stage 1 is about 50–60% of the box tall
  - stage 2 is about 65–80%
  - final and legendary forms are about 80–92%
- Keep everything inside 8 to 192, centred, and nothing cut off.
- **Small sizes:** the same drawing appears at 40px in lists and about 96–128px in battle. The
  silhouette and face must read at 40px. Details can be fine, as long as the design doesn't
  depend on them.

## People

People follow the same line, shading and colour rules, at a smaller scale with fewer details.

- **Portraits** (`portrait-<characterId>.svg`) appear at 56–86px in dialogue, the credits, and
  standing on the map. Each is a head-and-shoulders bust inside a round badge:
  - a background circle (`cx 100, cy 100, r 96`) in a soft tone that suits the character
  - a ring in their accent colour
  - the bust clipped to the circle with a `clipPath`
  - a face turned slightly left, with expressive eyes and brows
  - costume details that say who they are at a glance
- **Map figures** stand in a 200 × 200 box, feet at y ≈ 178, on a ground shadow
  `<ellipse cx="100" cy="180" rx="40" ry="9" fill="#1d2b33" opacity="0.25"/>`. This covers
  `player-*`, `trainer`, `trainer-leader` and `npc-*`.
  - They're drawn at about 40–50px, so give them a chunky, readable shape: a big head (about
    40% of the height), clear colours and a strong silhouette, like a modern pixel-art sprite
    reimagined as vector art.
  - Keep the top 40px of the box free of anything important: the game draws the gym-leader
    badge and the quest "!" there.
- **The player:**
  - `player-down` faces the viewer
  - `player-up` shows the back
  - `player-side` faces **right**, and is mirrored for walking left
  - All three are the same character with the same outfit.

## Technical rules (the checker enforces these)

The game draws these with react-native-svg on phones and the web, which handles only part of
SVG. `node scripts/harsi-art.js check <file>` must pass.

- **Root:** `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">`, with no width or
  height.
- **Elements:** `g`, `defs`, `path`, `circle`, `ellipse`, `rect`, `polygon`, `polyline`, `line`,
  `linearGradient`, `radialGradient`, `stop`, `clipPath`.
- **Not allowed:**
  - `filter`, `mask`, `pattern`, `use`, `image`, `text`, `style`
  - CSS of any kind: no `style=""` and no `class=""`
- **Attributes:** use presentation attributes only (`fill`, `stroke`, `stroke-width`,
  `opacity`, `transform`, and so on).
- **ids:** every `id` starts with the file name and a dash (`calfleaf-body`), because ids are
  shared across the whole page. Every `url(#…)` must point at an id defined in the same file.
- **Placement:** gradients and clip paths go inside `<defs>`.
- **Size:** keep a file under 10 KB, 16 KB at most. Round numbers to 1 decimal.

## Tools

```sh
node scripts/harsi-art.js check src/art/harsi/svg/calfleaf.svg                       # validate
node scripts/harsi-preview.js /tmp/out.png calfleaf vinehorn mosstaur                 # big, battle, list, dark
node scripts/harsi-preview.js /tmp/out.png --lineup calfleaf vinehorn mosstaur        # same scale, side by side
node scripts/harsi-preview.js /tmp/out.png --people portrait-abela player-down        # people
```

Look at the PNG and judge it honestly. Ask: does it read at 40px, is the line weight consistent,
is the anatomy believable, would a player want this on their team? Then iterate.
`node scripts/harsi-art.js build` bundles everything into the game; whoever integrates runs it.

## House recipe (from the starters)

The nine starter files (`calfleaf`, `vinehorn`, `mosstaur`, `pharawoof`, `infernux`, `pyrollis`,
`duckling`, `platyflow`, `marinedge`) are the reference implementation of this guide. Open one
beside your own file and copy its structure. The anchor sheets that show them are rendered with
`--lineup` and the normal row view of the same nine ids.

### Layer order (every Ħarsi file)

1. `<defs>`: gradients first, then clip paths (one per big form, one per eye).
2. The ground shadow ellipse.
3. **The backing group**: every shape that touches the silhouette, filled and stroked in its
   outline colour at `stroke-width="7"`. It sits under everything, so only its outer 3.5px shows.
4. The parts, back to front: far limbs, tail, body, near limbs, ears, head, the face, the eyes,
   and last any ornament that sits on top (crests, flowers, jewellery).
5. Each big form is drawn as a clip group (base, shadow, rim light, highlight), then its own
   `2.5` outline on top. Overlap lines come out thin and the outer contour comes out bold, with
   no extra work.

```svg
<g fill="#215530" stroke="#215530" stroke-width="7" stroke-linejoin="round" stroke-linecap="round">
  <path d="BODY"/><path d="HEAD"/><path d="LEGS"/>                <!-- same d as the parts -->
  <path d="HORNS" fill="#6a4022" stroke="#6a4022"/>                <!-- other materials override -->
  <path d="TAIL" fill="none" stroke-width="8"/>                    <!-- tails/stems are tubes -->
</g>
```

### Outline colours

Take the part's base colour and keep its hue, or nudge it 10–20° towards blue. Drop the
lightness to about 15–25% and keep the saturation high. Never use black or grey. Use one outline
colour per material, and darken it a little with each stage. The values the starters use:

| Material | Base | Outline |
| --- | --- | --- |
| Green body (stage 1 / 2 / 3) | `#7cc453` / `#62b047` / `#4c923e` | `#215530` / `#1d4d2c` / `#173d24` |
| Tan hound coat (1 / 2 / 3) | `#f09a4a` / `#ea8a42` / `#e2652e` | `#6a2a18` / `#5e2414` / `#5a1c12` |
| Duck blue (1–2), steel (3) | `#5fb8e8`, `#4a9fd4`, `#97aabd` | `#1d4f86`, `#163f73`, `#24344c` |
| Honey limestone, hooves | `#e8c98c`, `#f0cf86` | `#5e3d1e`, `#6a4022` |
| Carob wood | `#a06a3c` | `#3a2212` |
| Bills and webbed feet | `#ffd63f`, `#ffaa36` | `#9a521a` |
| Gold and brass | `#f3c14a` | `#6a3a0e` |
| Sulla magenta | `#d23f78` | `#6e1c40` |
| Flame | gradient | `#a8341a` |
| Tyrian purple cloth | `#8a3484` | `#3a1036` |
| Pupils and lash lines | — | `#1b1622` |

A boundary *inside* a form between two colour regions (cream muzzle on a green head, white belly)
gets a 2.5 line in a mid-dark tone of the body, such as `#4f6a36` on green. It is never the full
outline colour, and it is never a separate shape with its own heavy outline.

### Stroke widths actually used

- **Silhouette:** the backing at `7`, plus the part's own `2.5` line, gives a visible outer line
  of about 4.75.
- **Inner lines** (overlaps, region boundaries, plates): `2.5`.
- **Muscle and haunch lines:** `2` to `2.5`, drawn as open paths.
- **Small parts that are not in the backing** (leaves, florets, inner ears, rivets, beads):
  `1.5` to `2`.
- **Eyes:** sclera outline `2`, lash line `3.2`–`3.8`, brow `2.3`–`3`.
- **Tubes** (tails, stems, twigs): a dark stroke of `8`–`10` in the backing, then a `3`–`4.5`
  stroke in the fill colour on top.
- **Caps and joins:** round everywhere. Use `stroke-linecap="butt"` only for dashed rubble walls.

### Shadows and highlights (the cel recipe)

The light comes from the top left. Each big form is one clip path plus a clip group.

```svg
<linearGradient id="calfleaf-g" gradientUnits="userSpaceOnUse" x1="50" y1="76" x2="130" y2="166">
  <stop offset="0" stop-color="#a8de70"/><stop offset=".55" stop-color="#7cc453"/></linearGradient>
<clipPath id="calfleaf-cb"><path d="BODY"/></clipPath>
…
<g clip-path="url(#calfleaf-cb)">
  <rect x="84" y="100" width="84" height="66" fill="url(#calfleaf-g)"/>                    <!-- base -->
  <path d="M84 142C108 156 148 152 168 118V170H84Z" fill="#55a25a"/>                       <!-- shadow -->
  <path d="M100 120C110 126 112 142 104 160H86V120Z" fill="#4a955a"/>                      <!-- accent shadow -->
  <path d="M98 157C120 160 146 156 160 140" fill="none" stroke="#86ca62" stroke-width="2"/> <!-- rim light -->
  <path d="M114 111C126 107 140 107 152 111C140 110 126 112 116 116Z" fill="#d6f6a0"/>     <!-- highlight -->
</g>
<path d="BODY" fill="none" stroke="#215530" stroke-width="2.5"/>
```

- **Base:** a two-stop gradient. The light tint (about 15–20% lighter) sits at `0` and the base
  colour at `.5`–`.55`.
  - Use `gradientUnits="userSpaceOnUse"` for the main body gradient, and reuse it for every
    clipped part (head, body, near legs).
  - That way all the parts share one light direction, and a shoulder can blend into the body
    with no seam.
- **Shadow:** 22–28% darker, with the hue nudged towards blue. Only its upper edge matters, a
  curve that follows the form along the belly, under the jaw and down the far side. The rest can
  overshoot because the clip trims it.
  - Pairs used: `#7cc453` → `#55a25a`, `#f09a4a` → `#c8703c`, `#ea8a42` → `#bf5e36`,
    `#e8c98c` → `#c49a5e`.
  - On blue-and-white bodies, the shadow is one overlay at `#2f74b8` with opacity `.4`–`.55`
    (`#1d3a66` at `.35` on steel), so it shades both colour regions at once.
- **Accent shadow:** about 35% darker, only where one form sits under another: the chest under
  the head, the inside of a far leg.
- **Rim light:** a 2px stroke one step lighter than the base, 3–4px inside the lower-right edge.
- **Highlight:** a thin crescent near the top left of each big form, never a round blob.
  - Tints: `#d6f6a0` on green, `#ffd89a` on tan, `#c4eafc` on blue, `#fff` on steel.
  - Pure white speculars only on glossy parts: eyes, noses, bills, metal, flame cores.
- **Small forms** (legs, ears, horns, hooves, stones, bills) take no clip. A hard-stop gradient
  does the cel shadow in a single element. Far-side limbs use the same gradient one step darker,
  so they sit back.

```svg
<linearGradient id="calfleaf-leg" x1="0" x2="1">
  <stop offset=".58" stop-color="#7cc453"/><stop offset=".58" stop-color="#55a25a"/></linearGradient>
```

### Eyes

```svg
<radialGradient id="calfleaf-iris" cx=".5" cy=".78" r=".75">
  <stop offset="0" stop-color="#e8b04e"/><stop offset=".5" stop-color="#94582a"/><stop offset="1" stop-color="#3b2010"/></radialGradient>
<clipPath id="calfleaf-e1"><ellipse cx="88" cy="100" rx="9" ry="11.5"/></clipPath>
…
<ellipse cx="88" cy="100" rx="9" ry="11.5" fill="#fffdf4"/>                         <!-- sclera -->
<g clip-path="url(#calfleaf-e1)">
  <ellipse cx="86.5" cy="102" rx="7.5" ry="9.5" fill="url(#calfleaf-iris)"/>         <!-- iris, nudged forward -->
  <ellipse cx="86" cy="103" rx="4.6" ry="6.2" fill="#1b1622"/>                       <!-- big pupil -->
  <path d="M76 86H100V94C94 91 82 91 76 95Z" fill="#c9cfe0"/>                         <!-- lid shadow -->
</g>
<ellipse cx="88" cy="100" rx="9" ry="11.5" fill="none" stroke="#215530" stroke-width="2"/>
<path d="M79.5 94C82 89.5 85.5 88.3 88.5 88.3C92 88.4 95 90.5 96.8 94" fill="none" stroke="#1b1622" stroke-width="3.5"/>
<circle cx="82.8" cy="97" r="3.3" fill="#fff"/>                                       <!-- big highlight -->
<circle cx="88" cy="101.5" r="1.5" fill="#fff"/>                                      <!-- small highlight -->
```

- **Stage 1 and 2:**
  - An elliptical sclera, a little taller than wide. The near eye is about 18×23 and the far eye
    about 75% as wide, foreshortened.
  - The iris and pupil are nudged 1–1.5px towards the facing direction.
  - A lid-shadow band sits across the top inside the clip.
  - The lash line follows the top arc.
  - The big highlight (r ≈ 3) sits at the upper left of the pupil, the small one (r ≈ 1.4)
    just below and right of it.
- **Final forms:**
  - The clip is an almond `<path>` whose top edge slopes down towards the inner corner.
  - The iris touches the lid, with no lid band.
  - A brow shape presses on the lid: a moss tuft (Moss-taur), a steel visor (Marinedge).
  - Highlights shrink to about 2.2 and 1.
- **Iris gradient:** always radial `cx .5 cy .78 r .75`, running from a light bottom through a
  mid tone to a dark rim.
- **Iris colour per line:** brown on the calf line, then glowing amber on Moss-taur; amber on
  the hound line; white-gold to red on Pyrollis; cyan to navy on the duck line.

### Gradients and clip paths

- **Id suffixes:**
  - `-g`: main body gradient. `-cb`, `-ch`, `-cl`: body, head and near-legs clips.
  - `-e1`, `-e2`: near and far eye. `-iris`.
  - `-leg`, `-far`: hard-stop limb gradients. `-fl`: flame. `-au`: gold.
- **Gradients:** two or three stops.
  - Linear with userSpaceOnUse for the body.
  - Hard-stop linear for limbs and props.
  - Radial only for irises.
  - Flames run vertically: a pale gold core at the bottom, orange, then magenta at the tips
    (`x1="0" y1="1" x2="0" y2="0"`).
- **Clip paths:** three to seven per file.
  - Body, head, both eyes, and one *compound* path for both near legs.
  - Any big prop (Marinedge's sail wing).
  - Clip only fills, never the outline strokes.
- **Path budget:** a big form's path appears three times (clip, backing, outline), and that is
  the main byte cost. Keep those paths to 6–10 curve segments.
- **Near limbs:** draw each one as a single shape with its shoulder or thigh, and clip and shade
  it like the body. Outline it with an *open* path that fades into the body, with no line across
  the top of the shoulder. This gives real anatomy instead of tubes stuck on.
- **Transforms:** `rotate` and `translate` may wrap whole parts (Pharawoof's head tilt is
  `rotate(6 86 128)` on both its backing and its drawing). Never `scale` a group that contains
  outlines, because that changes the line weight. Scaling small fill-only motifs is fine.

### File size

Measured minified, the way the checker counts:
- Stage 1: 7–9 KB.
- Stage 2: 7–11 KB.
- Finals: 9–12.3 KB.

The finals pass the 10 KB soft target, which is fine up to the 16 KB limit. Use integers almost
everywhere and one decimal only in the eyes. A starter has about 60–110 elements.

### Everything else that defines the look

- **The 3/4 view, facing left:**
  - The face's centre line sits left of the head's centre, and the near eye is about 1.3× the
    far eye.
  - The far legs show to the *left* of the near legs, under the head and chest. They are shorter
    (feet at y 179 against 182) and one step darker.
- **Sizes the starters hit,** measured stroke-inclusive from the top of the art to the feet:
  - Stage 1 is about 63%: a big head and short legs.
  - Stage 2 is about 79–83%.
  - Finals are 85–86%, and they fill the frame's width as well as its height.
- **One signature motif per line, carried through every stage and growing each time:**
  - Calf line: a sulla flower tail tuft, then clover leaves, then honey-limestone hooves.
  - Hound line: blushing Pharaoh-hound ears, then ear flames, then an ember tail.
  - Duck line: the canary bill, then the luzzu yellow-and-red sheer stripes.
- **One nameable piece of Malta in each design:** the Ġgantija trilithon, a Tarxien double
  spiral, the Tanit disc and crescent, Tyrian purple, the Eye of Osiris, the eight-pointed cross
  (four V-notched arms, not a star), the luzzu stem post and sheer line.
- **Rubble walls:** a `6.5` dark stroke, then the same path in honey at `3.5` with
  `stroke-dasharray="6 1.6 4 1.6 5 1.6"` and `stroke-linecap="butt"`. Round caps fill the gaps
  and turn the stones into sausages.
- **Glows** (no filters): a pale shape behind the glowing thing at opacity `.25`–`.35`. Keep
  them small, because a big one reads as a smudge on light backgrounds.
- **Stage-1 blush:** an ellipse of about 11×6 on the near cheek, `#ff6a6a` to `#f2849e`, at
  opacity `.5`–`.6`.
- **Ground shadow:** `rx` is the footprint plus about 8.
