# Outline Pop: design spec for our home app

A private PWA for two people (H and W), used on iPhone every day. The look is "outline pop": warm white cards with ink outlines and hard offset shadows on a pastel green page in light mode, and on warm olive in dark mode. One thing is allowed to be loud: **the note between us**. Everything else stays calm.

## Files

- `tokens.css`: every colour, radius, shadow and font as CSS variables, with light and dark built in. Import it once globally; never hard-code a hex in a component.
- `reference/home-light.html`, `reference/home-dark.html`: the home screen.
- `reference/components-light.html`, `reference/components-dark.html`: every component and its states.

The reference files were made in a design tool. They contain template syntax (`<x-dc>`, `{{ }}`, `<sc-for>`, `support.js`) that won't run in the app. Treat them as visual and CSS references: copy the sizes, spacing and structure, rebuild them as real app components, and swap the hex values for the tokens.

## Theme

- Follow the phone's setting (`prefers-color-scheme`). Allow an override with `<html data-theme="light|dark">`, saved per device.
- Dark mode is **warm olive**, not cool green or grey. Shadows get darker than the background in dark mode; they never turn light.

## Type

| Role | Font | Size / weight |
|---|---|---|
| Screen title ("Our home") | Bricolage Grotesque | 30 / 700, letter-spacing −1px |
| Big numbers (stats) | Bricolage Grotesque | 24 / 700 (20 for money) |
| Card titles, buttons, tab label | Bricolage Grotesque | 15 / 700 |
| Body, list items | Inter | 14 / 700 for item names, 14 / 500 otherwise |
| Meta (times, "added by W") | Inter | 12 / 600, `--text-muted` |
| **Notes between us** | Special Elite | 21 / 1.3 line-height |

The typewriter font is only for notes, never for UI or numbers. Write in sentence case and avoid ALL-CAPS labels.

## Colour means category

Use the same colour for the same thing on every screen: tile, list header tint, tab icon accent.

- Shopping → `--shopping` (orange), with header tint `--shopping-tint`
- Chores → `--chores` (lilac), with tint `--chores-tint`
- Money → `--money` (yellow)
- Note / "you are here" (active tab) → `--hero` (peach)
- Delete → `--danger`. Checked → `--done`.
- **Main action button is ink** (`--primary-bg` / `--primary-text`), never a category colour.
- Text and icons on any coloured fill are always `--on-fill` (dark), in both themes.
- Don't put `--done` green directly on the page background, because it's too close to the green. Use it only on white or olive surfaces.

## Depth: three levels, no more

1. **Hero** (`--shadow-hero` + `--edge-hero` border): only the note on the home screen, and dialogs. One per screen.
2. **Interactive** (`--shadow-hard`): things you tap that sit on the page, like stat tiles, buttons and the tab bar.
3. **Info** (border only, no shadow): week strip, lists, tables.

Pressed state: the shadow disappears and the element moves 3px right and down.

## Components (sizes in px = iOS pt)

- **Page**: padding top 52 (safe area), left 20, right 22 (room for the hero offset). 18 between sections.
- **Card**: border 2, radius 14, padding 14 to 16.
- **Button**: height 48, radius 12, padding 0 22. Block button height 52. Icon button 44 × 44. Round + button 56 with a hard shadow.
- **Input**: height 48, radius 12, border 2 `--edge-control`. On focus it gets an offset in `--chores`. On error it gets an offset in `--danger`, `--error-bg`, and a message below in `--error-text`.
- **Search**: height 52, with a dashed divider before a 36 × 36 scan button.
- **List card**: header 42 (tinted with its category colour). Rows 54, icon box 34 (1.5 dashed, radius 9), checkbox 24 on the right. Dashed `--divider` between rows. The home screen shows at most 2 rows plus "See all".
- **Checkbox**: 24, round, border 2. When checked it's filled `--done` with an ink tick. Square variant (radius 7) is for settings.
- **Toggle**: 52 × 30 pill, knob 20 with a border. Checked fill `--chores`.
- **Segmented control**: track `--surface-sunken`, border 2, radius 12. The active segment is `--surface` with a border.
- **Chip**: height 34, pill, border 2. Selected = `--money` fill.
- **Badge**: 24 count circle, or a 26 status pill.
- **Stat tile**: 88 tall, category fill, hard shadow, icon at the top and number + label at the bottom.
- **Note window**: 34 title bar filled `--money` with "From W" and one real button (send a heart back). Body `--surface-note`, note text in `--font-note`, then "Sent 7:12, seen 7:20" and a Reply pill. Hero shadow.
- **Week strip**: 7 columns. Today is a 62-tall pill filled `--text` with `--bg`-coloured text. Event dots are 5px.
- **Tab bar**: floats 18 from each side and 26 from the bottom (plus the safe area). Height 62, radius 16, hard shadow. The active tab is a chip filled `--hero` with icon + label; the others are 44 × 44 icon buttons with `aria-label`s.
- **Dialog**: retro window with a title bar filled `--danger`, a real close button, and hero shadow. Buttons are "No" and "Yes, delete".
- **Toast**: height 52, with a done-circle, the message and "Undo".

## Rules

- No decoration that doesn't mean something: no random sparkles, and no fake window buttons that do nothing.
- Every tappable thing is at least 44 tall, uses a real `<button>`/`<a>`/`<input>`, and has a visible focus ring (`:focus-visible` is in tokens.css).
- Use the same word for an action everywhere: a "Delete" button leads to a "Deleted" toast.
- Copy is plain and in sentence case: "Today at 7:30 PM", not "TODAY · 7:30 PM".
