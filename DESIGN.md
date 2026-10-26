---
name: Cat Coup
description: Playful deception at a cozy Midnight Cat Lounge.
colors:
  primary: "#e8b86d"
  primary-hover: "#f7cb87"
  secondary: "#a6c8bc"
  secondary-hover: "#c7dfd5"
  table: "#14272f"
  surface: "#1e3540"
  ink: "#f5eee0"
  muted: "#b5c9ca"
  line: "#3c5359"
  input: "#12242c"
  primary-ink: "#172c33"
  secondary-ink: "#142b2d"
  card-paper: "#eee4ce"
  card-ink: "#22343b"
  danger: "#663a3b"
  danger-ink: "#fff3ed"
  decision: "#213d45"
typography:
  display:
    fontFamily: "Geist, Arial, sans-serif"
    fontSize: "clamp(52px, 5.4vw, 80px)"
    fontWeight: 800
    lineHeight: 1.04
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "Geist, Arial, sans-serif"
    fontSize: "26px"
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Geist, Arial, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.65
  label:
    fontFamily: "Geist, Arial, sans-serif"
    fontSize: "13px"
    fontWeight: 600
rounded:
  field: "8px"
  button: "9px"
  card: "10px"
  panel: "12px"
  dialog: "14px"
  entry: "16px"
spacing:
  compact: "8px"
  control-gap: "10px"
  card-gap: "14px"
  section-gap: "24px"
  panel-padding: "32px"
  play-gap: "40px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-ink}"
    rounded: "{rounded.button}"
    padding: "13px 20px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-secondary:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.secondary-ink}"
    rounded: "{rounded.button}"
    padding: "13px 20px"
  button-quiet:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.button}"
    padding: "13px 20px"
  button-danger:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.danger-ink}"
    rounded: "{rounded.button}"
    padding: "13px 20px"
  input:
    backgroundColor: "{colors.input}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: "14px 15px"
  entry-card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.entry}"
    padding: "32px"
  decision-panel:
    backgroundColor: "{colors.decision}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    padding: "24px 28px"
---

# Design System: Cat Coup

## Overview

**Creative North Star: "Midnight Cat Lounge"**

A cozy table for playful deception: deep navy felt supports warm original cat portraits, amber actions, and pale readable text. The atmosphere is intimate and tactile, while the controls remain direct enough for fast multiplayer decisions.

Geist carries both expressive headlines and compact game information. Tonal panels organize the table; the warm paper of influence cards distinguishes physical objects from interface controls. Cat characters replace human characters as a durable brand commitment.

**Key Characteristics:**

- Midnight navy table with amber-gold actions and sage secondary controls.
- Warm illustrated cats framed as pale physical cards.
- Compact, readable game controls with explicit selection and turn states.
- Brief arrival motion that respects reduced-motion preferences.

## Colors

The palette pairs a cool, deep table with warm cards and amber highlights.

### Primary

- **Amber Gold**: primary actions, key headline words, coins, room codes, turn borders, selection, and keyboard focus.
- **Light Amber**: the primary button's hover response.

### Secondary

- **Soft Sage**: secondary actions, links, and connected status.
- **Pale Sage**: secondary button hover response.

### Tertiary

- **Muted Burgundy**: destructive controls, with pale warm text. Error messages use a related dark red surface and a visible border.

### Neutral

- **Midnight Table**: the page background and visual foundation.
- **Blue Felt Surface**: entry forms, occupied seats, and rules dialog.
- **Warm Pale Ink**: primary text against dark surfaces.
- **Cool Mist**: supporting text and secondary metadata.
- **Slate Seam**: dividers and quiet control borders.
- **Inset Navy**: input backgrounds.
- **Warm Card Paper** and **Dark Card Ink**: influence card frames and captions.
- **Decision Teal**: the central current-decision panel.

### Named Rules

**The Amber Signal Rule.** Use amber for actionable emphasis and meaningful game state; pair it with labels, borders, or selection outlines so state remains understandable.

## Typography

**Display Font:** Geist, with Arial and sans-serif fallbacks.  
**Body Font:** Geist, with Arial and sans-serif fallbacks.

**Character:** A single clear sans-serif family keeps the illustrated cats expressive without making the control layer theatrical. The shipped font files provide regular (400), semibold (600), and heavy (800) weights.

### Hierarchy

- **Display**: heavy, tightly tracked hero type; the responsive desktop clamp becomes 58px in narrower layouts.
- **Headline**: section headings use the headline token; the room heading grows to 40px on desktop and 32px on mobile.
- **Title**: game section headings are 19px, with compact 18px mobile variants.
- **Body**: rules and entry copy use 14px; introductory copy uses 17px desktop and 15px mobile. Paragraph leading is 1.65.
- **Label**: semibold form labels use 13px. Game metadata commonly uses 10–12px; retain sufficient contrast and visible hierarchy.
- **Numeric detail**: coin counts use tabular numerals. Room codes use generous tracking, with the main code at 30px and 0.14em.

## Layout

The centered application container has a maximum width of 1600px and horizontal gutters of 5%, moving to 4% at 1000px and 20px at 700px. Spacing is contextual rather than an invented universal scale: compact control gaps sit inside larger panel and section separations.

The welcome surface uses a two-column grid with a flexible illustration area and a room form. Lobby seats use three equal columns, falling to two on mobile. The game places wrapping opponents above the current decision, then presents hand and actions in two columns. At 1000px the decision responses stack beneath their text; at 700px the play area becomes a vertical flow. The action tray keeps two columns. Rules character guides become one column on mobile.

At 1500px and above, the welcome composition gains vertical breathing room and larger card artwork. Keep decision text readable: the central panel caps supporting copy at 72ch. Long player names wrap instead of forcing wider seats.

## Elevation & Depth

Depth combines tonal layering, fine borders, and restrained shadows. Interface panels sit close to the table; influence cards lift more clearly as physical objects. The rules dialog dims the table with an opaque navy backdrop.

### Shadow Vocabulary

- **Influence card** (`0 10px 26px #07131955`): physical card separation.
- **Entry panel** (`0 18px 40px #09151c33`): ambient lift for the room form.

**The Table Depth Rule.** Use tonal panels and borders for game organization; reserve the stronger existing shadow for physical influence cards.

## Shapes

Gently rounded rectangles dominate. Fields, buttons, influence cards, decision panels, dialogs, and entry panels use their named radius tokens. Fine borders define edges against the table. Portraits clip to rounded artwork windows in cards and oval silhouettes in player seats. Empty seats use dashed borders; occupied seats use solid borders and a filled surface.

## Components

### Buttons

Direct and tactile. Primary buttons use amber with dark ink; secondary buttons use sage with dark ink. Quiet buttons retain warm pale text and a slate border. Destructive buttons use burgundy with a lighter red border. Standard controls have a minimum height of 44px, with deliberate compact exceptions for inline utility controls.

Hover lifts enabled buttons by 2px and changes the variant's background over 0.2 seconds. Keyboard focus uses an amber 3px outline with 4px offset. Disabled buttons reduce opacity to 0.45; game actions use 0.57.

### Cards / Containers

Entry forms use the broadest rounding and 32px padding, reduced to 25px at narrower widths. Influence cards have a pale paper frame, 6px padding, a thin warm border, and clipped cat artwork. Selected influence cards gain an amber outline and lift by 5px; revealed cards are desaturated and reduced to 0.6 opacity.

### Inputs / Fields

Inset navy fields have a thin cool border, warm text, amber caret, and a 48px minimum height. Placeholder text stays visibly lighter than the field. Target selectors use a compact 44px minimum height. Apply the shared visible keyboard focus outline.

### Navigation

The compact top bar aligns a heavy wordmark with rules access and connection status. A fine bottom divider grounds it. Its height changes from 100px to 80px on mobile, where the connection detail is hidden and the rules control becomes compact. Links use sage with a visibly offset underline.

### Current Decision

A teal panel with a fine sage-gray border and rounded corners keeps the active question prominent. Responses wrap and move below the copy at narrower widths. Preserve the decision's hierarchy across waiting, challenge, block, reveal, and completed-game states.

### Cat Cards and Motion

The original generated portrait strip at `public/assets/cat-court.png` supplies five warm character crops through a five-column background layout. Preserve its framing and consult the asset provenance record before replacement.

The landing fan uses static rotations from -16° to 16°. GSAP reveals its cards with a 28px rise, 0.65-second duration, 0.09-second stagger, and `power3.out`; decisions settle by 8px over 0.25 seconds. Motion never gates actions. GSAP exits before animation when reduced motion is requested, and CSS disables transitions, animations, and hover lift.

## Do's and Don'ts

### Do:

- **Do** retain the Midnight Cat Lounge palette and warm original cat artwork.
- **Do** mark turns, selections, and available responses with readable text and visible state treatments.
- **Do** preserve the responsive opponent, decision, hand, and action hierarchy.
- **Do** honor reduced motion in both CSS and GSAP.
- **Do** keep keyboard focus visible with the shared amber outline.

### Don't:

- **Don't** make another player's hidden influence visually inspectable.
- **Don't** rely on animation completion to unlock a game action.
- **Don't** replace cat portraits with unrelated human character imagery.
- **Don't** flatten selected, revealed, disabled, and active-turn states into the same treatment.

