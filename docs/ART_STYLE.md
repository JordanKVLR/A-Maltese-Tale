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
