# Favicon and Logo Display Design

Date: 2026-04-27  
Status: Approved (design), pending implementation

## Objective

Ensure favicon and logo are displayed correctly and consistently across the site, while preserving light/dark mode behavior and existing per-post social preview behavior.

## Scope

In scope:

- Canonical favicon usage and fallback tags in page metadata
- Canonical header logo usage
- Light/dark mode support for favicon and header logo
- Social preview image behavior with canonical fallback
- Centralized brand asset path constants to avoid drift

Out of scope:

- Broad visual redesign of header/navigation
- New branding assets beyond required adjustments for theme support
- Platform-specific app icon/manifest expansion beyond current metadata needs

## Canonical Asset Decisions

- Canonical favicon: `/bustamam-favicon.svg`
- Canonical logo (header + social fallback): `/bustamam-technology-wordmark.svg`
- Existing fallback assets remain in use for compatibility:
  - `/favicon-32.png`
  - `/favicon.ico`
  - `/apple-touch-icon.png`

## Proposed Architecture

### 1) Single source of truth for brand assets

Add a brand constants module (for example `src/consts/brand.ts`) with exported paths:

- `CANONICAL_FAVICON_SVG = "/bustamam-favicon.svg"`
- `CANONICAL_LOGO = "/bustamam-technology-wordmark.svg"`
- `SOCIAL_FALLBACK_IMAGE = "/bustamam-technology-wordmark.svg"`

All consumers (metadata and header branding) should reference these constants instead of hardcoded paths.

### 2) Metadata and favicon normalization in `BaseHead`

Normalize favicon tags for browser compatibility and deterministic behavior:

- `rel="icon" type="image/svg+xml"` -> canonical favicon SVG
- `rel="icon" type="image/png" sizes="32x32"` -> PNG fallback
- `rel="shortcut icon"` -> ICO fallback
- `rel="apple-touch-icon" sizes="180x180"` -> Apple icon

Keep existing theme-color metadata model:

- Light mode theme color
- Dark mode theme color

Ensure chosen colors continue to provide visible browser UI contrast in both schemes.

### 3) Social metadata behavior

Maintain existing per-page/per-post social image behavior:

- If a page/post provides an image, use it
- If not, use canonical logo fallback from constants

Apply this consistently to:

- `og:image`
- `twitter:image`

URLs remain absolute by constructing from current site URL context.

### 4) Header logo rendering

Update header branding to use canonical logo asset (`/bustamam-technology-wordmark.svg`) through the existing component flow.

No duplicate logo implementation should be introduced.

## Light/Dark Mode Requirements

### Favicon

`/bustamam-favicon.svg` already contains theme-aware styling via `prefers-color-scheme`. Preserve that behavior and ensure metadata still points to this canonical SVG.

### Header logo

`/bustamam-technology-wordmark.svg` must support both themes. Update the SVG so it renders with appropriate contrast in light and dark mode using internal SVG styling/media query rules (`prefers-color-scheme`).

Resulting behavior:

- Light mode: dark text/logo treatment on light context
- Dark mode: light text/logo treatment on dark context

## Data Flow (Post-Implementation)

1. Layout renders `BaseHead`.
2. `BaseHead` imports brand constants and emits normalized favicon + social metadata.
3. Pages/posts pass image when available; fallback resolves to canonical logo.
4. Header component references canonical logo path.
5. Browser theme preference controls SVG visual variant for favicon and logo.

## Error Handling and Edge Cases

- Missing page image: fallback to canonical logo (no broken social tags)
- Older browsers that ignore SVG favicon: PNG/ICO continue to provide icon
- iOS home screen icon remains explicit via apple-touch metadata
- If SVG media queries are unsupported, default SVG styling still must remain legible

## Testing and Verification Plan

### Static validation

- Run project build/type checks to verify no regression from path/config changes.

### Metadata verification

- Inspect rendered head output on representative pages:
  - homepage
  - at least one post with explicit cover image
  - at least one route without explicit image

Confirm:

- favicon tags point to canonical/fallback assets as designed
- social tags resolve to expected image (explicit image vs fallback)

### Runtime visual validation

- Light mode:
  - favicon visible in browser tab
  - header logo visible and correct
- Dark mode:
  - favicon inverts/adjusts correctly
  - header logo inverts/adjusts correctly

## Implementation Notes

- Do not change content strategy for post hero/cover images.
- Prefer minimal component API changes.
- Keep branding paths centralized to simplify future asset replacement.

## Success Criteria

- Favicon renders correctly across supported browsers using canonical SVG with fallbacks
- Header logo uses canonical wordmark and remains legible in both themes
- Social metadata preserves per-post images and falls back to canonical logo when absent
- No hardcoded duplicated brand asset paths in affected components
