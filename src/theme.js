// Central design tokens so every screen feels like one cohesive product.
export const color = {
  bg: '#F1F5F9',
  surface: '#FFFFFF',
  surfaceMuted: '#F8FAFC',
  border: '#E8EDF3',
  text: '#0F172A',
  muted: '#64748B',
  faint: '#94A3B8',
  primary: '#1F6FEB',
  primaryDark: '#1D4ED8',
  primarySoft: '#EFF4FF',
  brandGradient: 'linear-gradient(135deg, #2563EB 0%, #4F46E5 100%)',

  // Semantic accents. Each pairs a strong ink with a soft wash so a badge, a
  // tile and a chart bar for the same meaning always agree.
  success: '#15803D',
  successSoft: '#DCFCE7',
  warning: '#B45309',
  warningSoft: '#FEF3C7',
  danger: '#DC2626',
  dangerSoft: '#FEE2E2',
  violet: '#7C3AED',
  violetSoft: '#EDE9FE',
  slate: '#475569',
  slateSoft: '#E2E8F0',
}

export const radius = { sm: 8, md: 12, lg: 16, xl: 20, pill: 999 }

export const shadow = {
  sm: '0 1px 2px rgba(15,23,42,0.06)',
  md: '0 4px 14px rgba(15,23,42,0.08)',
  lg: '0 10px 30px rgba(15,23,42,0.14)',
}

export const font = {
  h1: { fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em', color: color.text },
  h2: { fontSize: 17, fontWeight: 800, letterSpacing: '-0.01em', color: color.text },
  body: { fontSize: 14, color: color.text },
  small: { fontSize: 13, color: color.muted },
  // The uppercase micro-label above every group of fields.
  overline: {
    fontSize: 11,
    fontWeight: 800,
    color: color.faint,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  },
}
