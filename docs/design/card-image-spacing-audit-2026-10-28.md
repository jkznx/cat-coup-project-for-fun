# Card, artwork and 8px spacing audit — 2026-10-28

ShapeUI planning/check pass. Target: current Cat Coup UI, Classic and Vintage. No UI CSS, rules, artwork or public deployment was changed. Measurements were taken from an isolated local server at 127.0.0.1:3109, using the same current built application. Public rooms and microphones were not used.

## Coverage and method

29 rendered samples: homepage at five widths; both mode lobbies at five widths; six-seat game views in both modes at five widths; role guides in both modes at desktop/mobile. Widths: 320, 390, 768, 1024, 1440px. Images/fonts were loaded before inspection. Zero horizontal overflow and zero page JavaScript errors were recorded. Runtime measurements and screenshots are under `.impeccable/review/card-spacing-20261028/` (ignored local evidence).

Image scaling compares the untransformed CSS image box against the natural per-panel source dimensions: scaleX / scaleY = (CSS width / natural panel width) / (CSS height / natural panel height). A value of 1 preserves shape; above 1 means horizontal expansion relative to the vertical scale. Rounded avatars are evaluated separately from card portraits; a rounded mask alone does not explain anisotropic scaling.

## Findings

### P1 — artwork shape is not preserved

`.portrait` sets `background-size:500% 100%` and `.vintage-portrait` sets `300% 100%`. Both force independent horizontal and vertical scales instead of preserving each portrait's native aspect ratio.

| Source | Sheet size | Per-panel dimensions | Natural width/height |
| --- | --- | --- | ---: |
| Original five | 2172×724 | average 434.4×724 | 0.600 |
| Merchant/Bandit/Guardian | 960×640 | 320×640 | 0.500 |

| Measured hand image | Rendered box | Horizontal/vertical scale ratio | Effect |
| --- | --- | ---: | --- |
| Classic at 1440px | 146×184px | 1.322 | 32.2% wider relative to source proportions |
| Classic at 390/320px | 131×170px | 1.284 | 28.4% wider |
| Original-role image inside Vintage at 390px | 154×192.5px | 1.333 | 33.3% wider |
| New-role image inside Vintage at 1440px | 144×184px | 1.565 | 56.5% wider |
| New-role image inside Vintage at 390px | 154×192.5px | 1.600 | 60% wider |
| New-role image inside Vintage at 320px | 119×148.75px | 1.600 | 60% wider |

The role guide also stretches images, though less: original roles about 7.4% wider and new roles about 28.9%. Natural artwork is fine; CSS fitting is the problem. Do not regenerate the user's preferred original five cats.

Proposed correction: use per-role image assets or a correctly clipped sprite representation that preserves the natural image scale. Apply cover-style cropping with a deliberate face/headwear focal point; keep ears, eyes and signature costume readable. Do not apply `background-size:cover` blindly to the entire multi-panel sheet: that can expose adjacent portraits. Every role should share the same display frame, while its image retains its own natural proportions.

### P1 — Classic narrow-screen hand breaks the two-card row

At 320px the Classic hand is 280px wide. Each card is 145px wide and the gap is 12px, requiring 302px for a pair. Cards therefore stack into two rows (hand region 530px high). At 390px the pair fits. Vintage already uses a responsive two-column hand; its measured 320px card width is 135px.

Proposed correction: shared two-column responsive hand geometry for both modes, bounded card widths, a gap from the 8px scale, equal outer card heights and enough caption space for the longest ability. Keep role names, action costs, selectable/revealed states and hide-hand behavior intact.

### P2 — fixed spacing is not on a consistent 8px scale

| Component/property | Current computed values | Proposed main-grid value |
| --- | --- | --- |
| Desktop hand gap | 14px | 16px |
| Mobile hand gap, Classic / Vintage | 12px / 10px | 8px |
| Desktop action grid gap | 9px | 8px |
| Lobby seats gap | 18px | 16px |
| Seats section margin | 36px | 32px |
| Section-heading bottom gap | 18px | 16px |
| Decision section margin, desktop | 26px | 24px |
| Decision padding, desktop | 24px 28px | 24px 32px |
| Decision padding/margin, mobile | 20px | 16px or 24px after fit check |
| Mobile hand-to-actions section gap | 22px | 24px |
| Voice bar padding | 14px 18px | 16px 24px |
| Voice bar margin | 18px | 16px |
| Lobby action/mode-choice gaps | 12px | 16px |
| Main mobile side gutter | 20px | 16px or 24px after two-card fit check |
| Card frame padding | 6px | 8px |

Use a named main spacing scale: 8, 16, 24, 32, 48, 64px. A deliberate 4px half-step can remain for compact icon/text or caption relationships if approved; do not silently mix 9/10/14/18/22/26/28px values into main layout spacing. Border widths, text sizes, optical alignment, rotation and trigonometric seat positions are not automatically spacing-grid failures. Fluid widths and centered positions need not land on multiples of eight at every viewport.

### P2 — card labels and state hierarchy need protection

The homepage's overlapping fan partly hides/clips long role labels on small screens. Decorative overlap should not make a role name unreadable. Keep a fully readable legend/name treatment. At narrow widths, table names/metadata and the center remain dense; changing spacing must not produce new seat/center collisions or hide essential turn information.

## Resolution and delivery

Both delivery images decode successfully. At measured hand sizes, native pixels are sufficient for DPR 2 without upscaling: the limiting case is a new-role image at 154 CSS px wide, needing 308 physical pixels versus 320 available. At DPR 3 that same box would need 462px; the current new-role delivery may look softer on high-density screens. Keep the full 1536×1024 source (512×1024 per new role) and consider resolution variants rather than increasing the current download for every device.

The original five delivery source is unchanged and 2,195,468B. The new three-role delivery is 199,714B. Resolution and transfer cost are separate: do not fix incorrect CSS proportions by blindly enlarging the image or stretching it more. High-quality responsive delivery remains a separate performance experiment.

## Proposed implementation brief

- Preserve all artwork identities, both mode palettes, eight roles, game mechanics, private-hand semantics and voice controls.
- First correct portrait fitting and face/headwear framing, including cards, role help and decorative avatars.
- Next share a responsive two-card hand at 320–1440px; verify long names/abilities, selection, revealed cards and exchange states.
- Introduce spacing tokens and replace main layout gaps/padding/margins with the 8px scale; keep explicit optical/border/type exceptions.
- Verify both modes, all eight portraits and DPR 1/2/3 sizing in one bounded desktop/mobile pass; confirm no clipping, image bleed, distortion or horizontal overflow.

This is the completed check and proposed scope. Product UI changes remain a separate implementation step, consistent with the requested ShapeUI planning workflow.
