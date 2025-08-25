// components/FancyStatIcons.tsx
type IconSize = 'sm' | 'md' | 'lg'

const sizes: Record<IconSize, string> = {
  sm: 'h-8 w-8',
  md: 'h-12 w-12',
  lg: 'h-16 w-16',
}

export function TokenIcon({ size = 'md', className = '' }: { size?: IconSize; className?: string }) {
  return (
    <div className={`${sizes[size]} ${className} rounded-2xl p-2 bg-gradient-to-br from-indigo-50 to-blue-100 dark:from-indigo-900/40 dark:to-blue-900/30`}>
      <svg viewBox="0 0 64 64" className="w-full h-full">
        <defs>
          <linearGradient id="coinGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#A78BFA" />
            <stop offset="100%" stopColor="#60A5FA" />
          </linearGradient>
          <radialGradient id="shine" cx="30%" cy="25%">
            <stop offset="0%" stopColor="#fff" stopOpacity=".9" />
            <stop offset="100%" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* coin stack */}
        <g filter="url(#shadow)">
          <ellipse cx="28" cy="40" rx="16" ry="6" fill="url(#coinGrad)" />
          <ellipse cx="36" cy="32" rx="16" ry="6" fill="url(#coinGrad)" opacity=".85" />
          <ellipse cx="28" cy="24" rx="16" ry="6" fill="url(#coinGrad)" opacity=".7" />
        </g>

        {/* subtle shine */}
        <ellipse cx="24" cy="20" rx="10" ry="4" fill="url(#shine)" />

        {/* edge strokes */}
        <g className="opacity-70">
          <ellipse cx="28" cy="24" rx="16" ry="6" fill="none" stroke="white" strokeOpacity=".35" />
          <ellipse cx="36" cy="32" rx="16" ry="6" fill="none" stroke="white" strokeOpacity=".35" />
          <ellipse cx="28" cy="40" rx="16" ry="6" fill="none" stroke="white" strokeOpacity=".35" />
        </g>

        {/* soft shadow filter */}
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="2" floodOpacity=".2" />
        </filter>
      </svg>
    </div>
  )
}

export function IssuanceIcon({ size = 'md', className = '' }: { size?: IconSize; className?: string }) {
  return (
    <div className={`${sizes[size]} ${className} rounded-2xl p-2 bg-gradient-to-br from-emerald-50 to-teal-100 dark:from-emerald-900/40 dark:to-teal-900/30`}>
      <svg viewBox="0 0 64 64" className="w-full h-full">
        <defs>
          <linearGradient id="chartBg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#10B981" stopOpacity=".15" />
            <stop offset="100%" stopColor="#34D399" stopOpacity=".05" />
          </linearGradient>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#34D399" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
        </defs>

        {/* rounded chart canvas */}
        <rect x="6" y="10" width="52" height="44" rx="10" fill="url(#chartBg)" />

        {/* grid */}
        <g stroke="#10B981" strokeOpacity=".25" strokeWidth=".8">
          <path d="M14 20H50" />
          <path d="M14 30H50" />
          <path d="M14 40H50" />
          <path d="M22 16V52" />
          <path d="M34 16V52" />
          <path d="M46 16V52" />
        </g>

        {/* rising line */}
        <path d="M14 44 L26 38 L33 42 L42 30 L50 22" fill="none" stroke="url(#lineGrad)" strokeWidth="4" strokeLinecap="round" />

        {/* arrow head */}
        <path d="M46 20 L52 20 L52 26" fill="none" stroke="#059669" strokeWidth="4" strokeLinecap="round" />

        {/* sparkles */}
        <g fill="#34D399" opacity=".9">
          <circle cx="26" cy="18" r="1.4" />
          <circle cx="40" cy="14" r="1.2" />
          <circle cx="50" cy="28" r="1.2" />
        </g>
      </svg>
    </div>
  )
}
