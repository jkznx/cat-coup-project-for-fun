# Cat court sprite

cat-court.png was generated with the built-in image generation tool on 2026-10-24 for this project. It is original generated artwork, not extracted from Coup's rulebook.

Prompt: Create a single original game-art sprite sheet for Cat Coup, a cozy Midnight Cat Lounge bluffing card game. Landscape 3:1 aspect ratio. Exactly five equally wide vertical panels left to right with no gutters, text or watermark. Painterly storybook gouache, warm fur, ink outlines and cunning expressions. Duke: golden Persian, crown, purple cloak; Assassin: charcoal cat, burgundy hood; Captain: ginger tabby, teal naval coat, pirate hat; Ambassador: Siamese, sage coat, spectacles; Contessa: white cat, midnight gown, pearls. Same portrait scale, full ears, distinct muted backgrounds. Original feline designs, no imitation of existing Coup card artwork.

Source generated file: exec-4833989b-808b-4c51-8123-b48ad87811a2.png. Native dimensions: 2172 × 724. Used as a five-panel CSS sprite without modification.

On 2026-10-27, `scripts/optimize-artwork.mjs` encoded a lossless WebP derivative for delivery. The original PNG and its generation metadata remain preserved. Both decoded RGBA buffers are identical at 2172 × 724 pixels. Only the delivery format changed.

- Original PNG: 3,194,511 bytes.
- Lossless WebP: 2,195,468 bytes (31.2737% smaller).
- Decoded RGBA SHA256 for both: `6fd32d8820a2aad02b57e923015f8c1ea6990696d76556c6ce83e7f5f20a6d50`.
- WebP SHA256: `346ca7e077d4176b548c3211cf998eec150a7811a0b55b798e60eed6cfcdd66c`.

Reproduction requires Sharp (set `SHARP_MODULE` to an existing installation, or install it separately as a development tool). The script refuses to overwrite an existing derivative and rejects any pixel or size regression. The browser uses the WebP; the PNG remains the original source artwork.

## Vintage court extension — 2026-10-28

Merchant, Bandit and Guardian were generated with the built-in imagegen tool using `cat-court-lossless.webp` as a style reference. The user specifically asked to preserve the visual style of the original five portraits; those five assets were not modified. The new three-panel art uses the same painterly storybook gouache, fur detail, court dress, warm portrait lighting and muted backgrounds. It is original generated feline artwork, not art from the Coup rulebook.

Panel order: Merchant (brown tabby, mustard coat and purse), Bandit (silver cat, black eye mask, burgundy cloak), Guardian (cream-and-brown cat, antique teal/brass armor and shield). No labels are baked into the image; role names and abilities remain accessible HTML.

Original output: `exec-08141129-4934-4636-9ded-d495f73a8066.png`; preserved in `docs/artwork/vintage-court-source.png` (1536 × 1024, 3,375,587 bytes). Web delivery: `vintage-court.webp`, resized to 960 × 640, WebP quality 86, 199,714 bytes. This derivative is intentionally lossy; it does not claim pixel identity with its source. Runtime conversion tool: Sharp, used only at build preparation time.

Delivery SHA256: `129abd985f2b132ddd3f5fe45b1f5bdc68f9d65118ac3936f26d37efae87c3bd`.

Prompt summary: one three-panel sprite, reference style only; matching scale, full ears/headwear, bust portraits, cunning expressions, gouache and fine ink, distinct muted backgrounds; no type, frames, watermark, original-five redraw or flat-vector style. The exact generation prompt is preserved in docs/artwork/vintage-court-source.prompt.txt. The optional scripts/prepare-vintage-artwork.mjs reproduces delivery encoding and refuses to overwrite an existing derivative.
