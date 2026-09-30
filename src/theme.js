// Central design tokens so every screen feels like one cohesive product.
//
// Colours resolve to CSS custom properties defined in styles.css, so the whole
// app follows the system light/dark appearance without any screen knowing about
// it. The palette follows Apple's semantic system colours, with the ink shades
// darkened where needed so small text clears 4.5:1 on its surface.
export const color = {
  bg: 'var(--bg)', // grouped background
  surface: 'var(--surface)', // cards, grouped cells
  surfaceMuted: 'var(--fill)', // fills inside a card: fields, tracks, wells
  border: 'var(--separator)',
  text: 'var(--label)',
  muted: 'var(--label-2)', // secondary label, ≥ 4.5:1 on surface
  faint: 'var(--label-3)', // tertiary: placeholders, chevrons, decoration only
  primary: 'var(--accent)',
  primaryDark: 'var(--accent-ink)',
  primarySoft: 'var(--accent-soft)',
  onPrimary: '#FFFFFF',

  // Semantic accents. Each pairs a strong ink with a soft wash so a badge, a
  // tile and a chart bar for the same meaning always agree.
  success: 'var(--green)',
  successSoft: 'var(--green-soft)',
  warning: 'var(--orange)',
  warningSoft: 'var(--orange-soft)',
  danger: 'var(--red)',
  dangerSoft: 'var(--red-soft)',
  violet: 'var(--purple)',
  violetSoft: 'var(--purple-soft)',
  pink: 'var(--pink)',
  pinkSoft: 'var(--pink-soft)',
  teal: 'var(--teal)',
  tealSoft: 'var(--teal-soft)',
  indigo: 'var(--indigo)',
  indigoSoft: 'var(--indigo-soft)',
  slate: 'var(--label-2)',
  slateSoft: 'var(--fill)',
}

export const radius = { sm: 8, md: 12, lg: 18, xl: 28, pill: 999 }

export const shadow = {
  sm: 'var(--shadow-sm)',
  md: 'var(--shadow-md)',
  lg: 'var(--shadow-lg)',
}

// Apple's iOS type ramp, one notch down (Dynamic Type "Small") — the default
// "Large" reads oversized on a 360pt-wide Android screen.
export const font = {
  largeTitle: { fontSize: 25, lineHeight: '30px', fontWeight: 700, letterSpacing: '0.01em', color: color.text },
  title1: { fontSize: 21, lineHeight: '26px', fontWeight: 700, letterSpacing: '0.01em', color: color.text },
  title2: { fontSize: 17, lineHeight: '22px', fontWeight: 700, color: color.text },
  title3: { fontSize: 16, lineHeight: '21px', fontWeight: 600, color: color.text },
  headline: { fontSize: 14, lineHeight: '19px', fontWeight: 600, color: color.text },
  body: { fontSize: 14, lineHeight: '19px', color: color.text },
  callout: { fontSize: 13, lineHeight: '18px', color: color.text },
  subhead: { fontSize: 13, lineHeight: '17px', color: color.muted },
  footnote: { fontSize: 11, lineHeight: '15px', color: color.muted },
  caption: { fontSize: 11, lineHeight: '14px', color: color.muted },

  // Kept for older call sites: the section header above a grouped list.
  h1: { fontSize: 21, fontWeight: 700, color: color.text },
  h2: { fontSize: 14, fontWeight: 600, color: color.text },
  small: { fontSize: 11, color: color.muted },
  overline: {
    fontSize: 11,
    fontWeight: 500,
    color: color.muted,
    textTransform: 'uppercase',
    letterSpacing: '0.02em',
  },
}

// Status is shown three ways — ink, wash and a solid dot — always with a label.
export const STATUS_TONE = {
  pending: 'warning',
  in_plan: 'violet',
  confirmed: 'success',
}
