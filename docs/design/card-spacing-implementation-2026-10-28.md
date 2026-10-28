# Card fitting and spacing implementation — 2026-10-28

Implemented the confirmed spacing scale **4, 8, 16, 24, 32, 40, 48px** in src/spacing.css, with zero resets and automatic centering explicitly separate. Main margin, padding and gap declarations in both mode skins use named tokens. Border widths, typography, fluid widths, card-fan overlap/rotation and circular seating coordinates are not quantized as spacing.

## What changed

- Replaced independent CSS image stretching with a shared SVG viewBox crop in src/Portrait.tsx. Each viewport isolates its own sprite panel and uses xMidYMin slice, preserving one scale in both axes while cropping excess. Cards, role help, lobby portraits and decorative table avatars use this component.
- Kept both original sprite files byte-for-byte unchanged. No image generation, resizing or compression change was bundled into this fix.
- Shared a responsive two-column hand in both modes, with an 8px mobile gap and 16px desktop gap. At 320px the Classic hand no longer stacks its two cards vertically.
- Moved homepage role names out of overlapping card captions into a wrapping legend, so long labels remain readable.
- Kept selected-card outlines inside the available 8px gap; exchange still displays four cards in two columns and permits selecting exactly two.
- Updated the artwork budget guard to discover actual sprite references in the production JavaScript/CSS bundle, since SVG image hrefs now own delivery references.

## Verification

- 22 rule/socket tests passed; no game or voice protocol changes.
- Full production TypeScript/Vite build and asset budget checked before publication.
- 29 isolated browser samples across 320, 390, 768, 1024 and 1440px: no horizontal overflow or page JavaScript errors.
- Measured SVG transformation ratio scaleX/scaleY = **1.000** for every visible portrait sampled, replacing hand-image ratios up to 1.600 in the baseline. This proves uniform scaling, not the absence of deliberate crop.
- Both influence cards share a row in every tested game viewport; computed fixed spacing values are in the confirmed scale. Automatic centering is checked as auto rather than treating its resolved pixel offset as a margin token.
- Classic/Vintage browser paths and mobile four-card exchange/selection checked.
- Synthetic two-peer WebRTC test passed, including T hold/release, pointer hold/release, blur muting and device release. No real microphone used.
- Mechanical changed-source detector returned zero findings.

The original audit remains historical in card-image-spacing-audit-2026-10-28.md. Before screenshots/measurements and new captures are in the ignored .impeccable/review/card-spacing-20261028/ folder. Publication updates frontend assets only, without restarting Node or resetting live rooms.
