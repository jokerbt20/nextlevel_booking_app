/**
 * A small, single-weight symbol set drawn to sit next to system text the way SF
 * Symbols do: 24-unit grid, round caps, stroke matched to a semibold label.
 * Every icon inherits `currentColor`, so tint comes from the text around it.
 *
 * Decorative by default (aria-hidden). An icon-only control must carry its own
 * aria-label on the button, never on the glyph.
 */
const PATHS = {
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="3.5" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </>
  ),
  calendarFill: (
    <>
      <path
        d="M7 3a1 1 0 0 1 1 1v.5h8V4a1 1 0 1 1 2 0v.5h.5A3.5 3.5 0 0 1 22 8v1H2V8a3.5 3.5 0 0 1 3.5-3.5H6V4a1 1 0 0 1 1-1ZM2 11h20v7.5A3.5 3.5 0 0 1 18.5 22h-13A3.5 3.5 0 0 1 2 18.5V11Z"
        fill="currentColor"
        stroke="none"
      />
    </>
  ),
  chart: <path d="M5 20V12M12 20V5M19 20v-9" />,
  chartFill: (
    <path
      d="M3.5 12.5a1.5 1.5 0 0 1 3 0V19a1.5 1.5 0 0 1-3 0v-6.5Zm7-7a1.5 1.5 0 0 1 3 0V19a1.5 1.5 0 0 1-3 0V5.5Zm7 5.5a1.5 1.5 0 0 1 3 0v8a1.5 1.5 0 0 1-3 0v-8Z"
      fill="currentColor"
      stroke="none"
    />
  ),
  gear: (
    <>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 2.8v2.4M12 18.8v2.4M21.2 12h-2.4M5.2 12H2.8M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7M18.5 18.5l-1.7-1.7M7.2 7.2 5.5 5.5" />
      <circle cx="12" cy="12" r="7" />
    </>
  ),
  gearFill: (
    <>
      <path
        d="M12 2.8v2.4M12 18.8v2.4M21.2 12h-2.4M5.2 12H2.8M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7M18.5 18.5l-1.7-1.7M7.2 7.2 5.5 5.5"
      />
      <path
        d="M12 4.5a7.5 7.5 0 1 1 0 15 7.5 7.5 0 0 1 0-15Zm0 4.8a2.7 2.7 0 1 0 0 5.4 2.7 2.7 0 0 0 0-5.4Z"
        fill="currentColor"
        stroke="none"
        fillRule="evenodd"
      />
    </>
  ),
  person: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20.5c1.2-3.6 4-5.5 7.5-5.5s6.3 1.9 7.5 5.5" />
    </>
  ),
  people: (
    <>
      <circle cx="9" cy="8.5" r="3.5" />
      <path d="M2.5 19.5c.9-3 3.3-4.7 6.5-4.7s5.6 1.7 6.5 4.7M16 5.2a3.3 3.3 0 0 1 0 6.4M18 14.9c1.8.6 3 2.1 3.5 4.1" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  chevronLeft: <path d="m14.5 5-7 7 7 7" />,
  chevronRight: <path d="m9.5 5 7 7-7 7" />,
  chevronDown: <path d="m5 9.5 7 7 7-7" />,
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m15.5 15.5 5 5" />
    </>
  ),
  xmark: <path d="M6 6l12 12M18 6 6 18" />,
  xmarkCircle: (
    <>
      <circle cx="12" cy="12" r="10" fill="currentColor" stroke="none" />
      <path d="m8.8 8.8 6.4 6.4M15.2 8.8l-6.4 6.4" stroke="var(--surface)" strokeWidth="2" />
    </>
  ),
  refresh: (
    <>
      <path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3" />
      <path d="M20 4v4.5h-4.5" />
    </>
  ),
  phone: (
    <path d="M6.6 3.5h2.6l1.5 4.2-2 1.4a11 11 0 0 0 6.2 6.2l1.4-2 4.2 1.5v2.6a2.1 2.1 0 0 1-2.3 2.1C10.7 18.9 5.1 13.3 4.5 5.8a2.1 2.1 0 0 1 2.1-2.3Z" />
  ),
  message: (
    <path d="M12 4c4.7 0 8.5 3 8.5 6.8s-3.8 6.8-8.5 6.8c-.9 0-1.7-.1-2.5-.3L5 19.5l1.1-3.6C4.5 14.6 3.5 12.8 3.5 10.8 3.5 7 7.3 4 12 4Z" />
  ),
  mail: (
    <>
      <rect x="3" y="5.5" width="18" height="13" rx="3" />
      <path d="m4 7.5 8 6 8-6" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  cup: (
    <>
      <path d="M6 8h12l-1.3 11a2 2 0 0 1-2 1.8H9.3a2 2 0 0 1-2-1.8L6 8Z" />
      <path d="M5 8h14M12 8l2-5h3" />
    </>
  ),
  pizza: (
    <>
      <path d="M12 21 3.8 6.2a16 16 0 0 1 16.4 0L12 21Z" />
      <path d="M5.3 9a13 13 0 0 1 13.4 0" />
      <circle cx="10.5" cy="11.5" r="1" fill="currentColor" />
      <circle cx="13.5" cy="15" r="1" fill="currentColor" />
    </>
  ),
  trash: (
    <>
      <path d="M4.5 6.5h15M9.5 6.5V4.8c0-.7.6-1.3 1.3-1.3h2.4c.7 0 1.3.6 1.3 1.3v1.7" />
      <path d="m6.5 6.5.8 12.2a2 2 0 0 0 2 1.8h5.4a2 2 0 0 0 2-1.8l.8-12.2" />
    </>
  ),
  exclamation: (
    <>
      <path d="M12 3.8 21.5 20H2.5L12 3.8Z" />
      <path d="M12 10v4.2M12 17.2v.1" />
    </>
  ),
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  checkCircle: (
    <>
      <circle cx="12" cy="12" r="10" fill="currentColor" stroke="none" />
      <path d="m7.5 12.3 3 3 6-6.3" stroke="var(--surface)" strokeWidth="2.2" />
    </>
  ),
  pencil: <path d="M4 20h4L19.3 8.7a2.8 2.8 0 0 0-4-4L4 16v4ZM13.5 6.5l4 4" />,
  box: (
    <>
      <path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5v-9Z" />
      <path d="M3.5 7.5 12 12l8.5-4.5M12 12v9" />
    </>
  ),
  balloon: (
    <>
      <path d="M12 3c3.6 0 6 2.8 6 6.2C18 13 15 16 12 16s-6-3-6-6.8C6 5.8 8.4 3 12 3Z" />
      <path d="M12 16l-1 2h2l-1-2M12 18c0 1.5-1.5 2-1.5 3.5" />
    </>
  ),
  logout: (
    <>
      <path d="M14 4.5H7a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h7" />
      <path d="M11 12h9.5M17 8.5l3.5 3.5-3.5 3.5" />
    </>
  ),
  lock: (
    <>
      <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
    </>
  ),
  eye: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  eyeSlash: (
    <>
      <path d="M4 4l16 16M9.9 5.8A9.7 9.7 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-2.9 3.7M6.3 7.4A17 17 0 0 0 2.5 12S6 18.5 12 18.5c1.6 0 3-.4 4.2-1" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </>
  ),
  truck: (
    <>
      <path d="M2.5 6.5h11v10h-11zM13.5 10h4l3 3.2v3.3h-7" />
      <circle cx="6.5" cy="17.5" r="1.8" fill="var(--surface)" />
      <circle cx="17" cy="17.5" r="1.8" fill="var(--surface)" />
    </>
  ),
  copy: (
    <>
      <rect x="8.5" y="8.5" width="11.5" height="11.5" rx="2.5" />
      <path d="M15.5 8.5V6A2.5 2.5 0 0 0 13 3.5H6A2.5 2.5 0 0 0 3.5 6v7A2.5 2.5 0 0 0 6 15.5h2.5" />
    </>
  ),
  send: <path d="M20.5 3.5 10 14M20.5 3.5l-6.5 17-4-6.5-6.5-4 17-6.5Z" />,
  trendUp: (
    <>
      <path d="m3.5 17 6-6 4 4 7-7.5" />
      <path d="M15.5 7.5h5v5" />
    </>
  ),
  trendDown: (
    <>
      <path d="m3.5 7 6 6 4-4 7 7.5" />
      <path d="M15.5 16.5h5v-5" />
    </>
  ),
  wallet: (
    <>
      <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18v3" />
      <rect x="3.5" y="8" width="17" height="11.5" rx="2.5" />
      <circle cx="16.5" cy="13.75" r="1.2" fill="currentColor" />
    </>
  ),
  trophy: (
    <>
      <path d="M7.5 4h9v5a4.5 4.5 0 0 1-9 0V4Z" />
      <path d="M7.5 6H4.5a3 3 0 0 0 3 4M16.5 6h3a3 3 0 0 1-3 4M12 13.5V17M8.5 20.5h7M9.5 17h5v3.5h-5z" />
    </>
  ),
  tag: (
    <>
      <path d="M3.5 12.2V5a1.5 1.5 0 0 1 1.5-1.5h7.2l8.3 8.3a1.5 1.5 0 0 1 0 2.1l-7.2 7.2a1.5 1.5 0 0 1-2.1 0L3.5 12.2Z" />
      <circle cx="8" cy="8" r="1.4" fill="currentColor" />
    </>
  ),
  sparkles: (
    <>
      <path d="M10 3.5 11.6 8.4 16.5 10l-4.9 1.6L10 16.5l-1.6-4.9L3.5 10l4.9-1.6L10 3.5Z" />
      <path d="M18 14.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z" />
    </>
  ),
}

export default function Icon({ name, size = 22, strokeWidth = 1.9, style, ...rest }) {
  const glyph = PATHS[name]
  if (!glyph) return null
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      style={{ display: 'block', flexShrink: 0, ...style }}
      {...rest}
    >
      {glyph}
    </svg>
  )
}
