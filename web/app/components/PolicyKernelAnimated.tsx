// app/components/PolicyKernelAnimated.tsx
"use client";

// Responsive, centered Policy Kernel diagram with subtle animation.
// - Inline SVG for precise sizing and positioning
// - Scales cleanly up to ~1040px without stretching
// - Tagline is rendered in React below the SVG (not inside the SVG)

export default function PolicyKernelAnimated() {
  return (
    <div className="relative overflow-hidden rounded-2xl border bg-white/80 backdrop-blur-sm p-6 md:p-10">
      {/* soft glow */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-[-140px] -translate-x-1/2 h-[420px] w-[1080px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.10),rgba(99,102,241,0.08),transparent_70%)] blur-2xl" />
      </div>

      <div className="mx-auto w-full max-w-[1040px]">
        <svg
          viewBox="0 0 1200 800"
          role="img"
          aria-labelledby="pkTitle"
          className="block w-full h-auto"
          preserveAspectRatio="xMidYMid meet"
        >
          <title id="pkTitle">Policy Kernel — Regimes to Ledgers flow</title>
          <defs>
            <linearGradient id="glow" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#34D399" stopOpacity="0.9" />
            </linearGradient>
            <radialGradient id="halo" cx="50%" cy="50%" r="60%">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
            </radialGradient>
            <filter id="soft">
              <feGaussianBlur stdDeviation="60" />
            </filter>
            <marker id="arrow" markerWidth="12" markerHeight="12" refX="8" refY="6" orient="auto">
              <path d="M0,0 L0,12 L12,6 z" fill="#cbd5e1" />
            </marker>
          </defs>

          {/* background halo */}
          <ellipse cx="600" cy="400" rx="450" ry="300" fill="url(#halo)" filter="url(#soft)" />

          {/* connection lines */}
          <g stroke="#cbd5e1" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.95">
            {/* left → kernel */}
            <path d="M280 400 H520" markerEnd="url(#arrow)">
              <animate attributeName="stroke-dasharray" values="1,240; 240,1" dur="2.6s" repeatCount="indefinite" />
              <animate attributeName="stroke-dashoffset" values="240;0" dur="2.6s" repeatCount="indefinite" />
            </path>
            {/* right → kernel (FIXED: should point towards kernel) */}
            <path d="M920 400 H680" markerEnd="url(#arrow)">
              <animate attributeName="stroke-dasharray" values="1,240; 240,1" dur="2.6s" repeatCount="indefinite" />
              <animate attributeName="stroke-dashoffset" values="240;0" dur="2.6s" repeatCount="indefinite" />
            </path>
            {/* top → kernel */}
            <path d="M600 200 V320" markerEnd="url(#arrow)">
              <animate attributeName="stroke-dasharray" values="1,120; 120,1" dur="2.6s" repeatCount="indefinite" />
              <animate attributeName="stroke-dashoffset" values="120;0" dur="2.6s" repeatCount="indefinite" />
            </path>
            {/* kernel → bottom left (FIXED: flow outwards, avoid title overlap) */}
            <path d="M520 480 L500 580" markerEnd="url(#arrow)">
              <animate attributeName="stroke-dasharray" values="1,140; 140,1" dur="2.6s" repeatCount="indefinite" />
              <animate attributeName="stroke-dashoffset" values="140;0" dur="2.6s" repeatCount="indefinite" />
            </path>
            {/* kernel → bottom right (FIXED: flow outwards, avoid title overlap) */}
            <path d="M680 480 L700 580" markerEnd="url(#arrow)">
              <animate attributeName="stroke-dasharray" values="1,140; 140,1" dur="2.6s" repeatCount="indefinite" />
              <animate attributeName="stroke-dashoffset" values="140;0" dur="2.6s" repeatCount="indefinite" />
            </path>
          </g>

          {/* central kernel */}
          <g>
            <circle cx="600" cy="400" r="80" fill="white" />
            <circle cx="600" cy="400" r="78" fill="url(#halo)" />
            <circle cx="600" cy="400" r="78" fill="none" stroke="url(#glow)" strokeWidth="3" />
            <text x="600" y="395" fontSize="20" textAnchor="middle" fill="#0a0a0a" fontFamily="Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial">Policy</text>
            <text x="600" y="415" fontSize="20" textAnchor="middle" fill="#0a0a0a" fontFamily="Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial">Kernel</text>

            {/* orbiters */}
            <circle r="4" fill="#10B981">
              <animateMotion dur="7s" repeatCount="indefinite" path="M600,400 m-120,0 a120,120 0 1,0 240,0 a120,120 0 1,0 -240,0" />
            </circle>
            <circle r="4" fill="#6366F1">
              <animateMotion dur="8.5s" repeatCount="indefinite" path="M600,400 m-100,0 a100,100 0 1,0 200,0 a100,100 0 1,0 -200,0" />
            </circle>
            <circle r="4" fill="#A855F7">
              <animateMotion dur="6s" repeatCount="indefinite" path="M600,400 m-80,0 a80,80 0 1,0 160,0 a80,80 0 1,0 -160,0" />
            </circle>
          </g>

          {/* headings */}
          <g fontSize="16" fill="#0a0a0a" fontFamily="Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial" opacity="0.95">
            <text x="200" y="330" textAnchor="middle">Regime Plugins</text>
            <text x="1000" y="330" textAnchor="middle">Ledger Adapters</text>
            <text x="600" y="100" textAnchor="middle">Asset Facts</text>
            <text x="500" y="600" textAnchor="middle">Universal Outputs</text>
            <text x="700" y="600" textAnchor="middle">Enforcement Intents</text>
          </g>

          {/* Regime Plugins (Left) */}
          <g fontSize="14" fontFamily="Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial">
            <g transform="translate(120,350)">
              <rect rx="12" width="160" height="28" fill="#ffffff" stroke="#e5e7eb" />
              <circle cx="14" cy="14" r="5" fill="#10B981" />
              <text x="26" y="18" fill="#111827">MiCA v1.0</text>
            </g>
            <g transform="translate(120,385)">
              <rect rx="12" width="160" height="28" fill="#ffffff" stroke="#e5e7eb" />
              <circle cx="14" cy="14" r="5" fill="#3B82F6" />
              <text x="26" y="18" fill="#111827">Travel Rule</text>
            </g>
          </g>

          {/* Ledger Adapters (Right) */}
          <g fontSize="14" fontFamily="Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial">
            <g transform="translate(920,350)">
              <rect rx="12" width="160" height="28" fill="#ffffff" stroke="#e5e7eb" />
              <rect x="8" y="8" rx="3" ry="3" width="12" height="12" fill="#2563EB" />
              <text x="26" y="18" fill="#111827">XRPL</text>
            </g>
            <g transform="translate(920,385)">
              <rect rx="12" width="160" height="28" fill="#ffffff" stroke="#e5e7eb" />
              <rect x="8" y="8" rx="3" ry="3" width="12" height="12" fill="#EA580C" />
              <text x="26" y="18" fill="#111827">Ethereum</text>
            </g>
          </g>

          {/* Asset Facts (Top) */}
          <g fontSize="14" fontFamily="Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial">
            <g transform="translate(520,120)">
              <rect rx="12" width="160" height="28" fill="#ffffff" stroke="#e5e7eb" />
              <circle cx="14" cy="14" r="5" fill="#A78BFA" />
              <text x="26" y="18" fill="#111827">Asset Context</text>
            </g>
            <g transform="translate(520,155)">
              <rect rx="12" width="160" height="28" fill="#ffffff" stroke="#e5e7eb" />
              <circle cx="14" cy="14" r="5" fill="#8B5CF6" />
              <text x="26" y="18" fill="#111827">Issuer Facts</text>
            </g>
          </g>

          {/* Universal Outputs (Bottom Left) */}
          <g fontSize="14" fontFamily="Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial">
            <g transform="translate(420,620)">
              <rect rx="12" width="160" height="28" fill="#ffffff" stroke="#e5e7eb" />
              <rect x="8" y="8" rx="3" ry="3" width="12" height="12" fill="#10B981" />
              <text x="26" y="18" fill="#111827">Requirements</text>
            </g>
            <g transform="translate(420,655)">
              <rect rx="12" width="160" height="28" fill="#ffffff" stroke="#e5e7eb" />
              <rect x="8" y="8" rx="3" ry="3" width="12" height="12" fill="#059669" />
              <text x="26" y="18" fill="#111827">Evidence</text>
            </g>
          </g>

          {/* Enforcement Intents (Bottom Right) */}
          <g fontSize="14" fontFamily="Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial">
            <g transform="translate(620,620)">
              <rect rx="12" width="160" height="28" fill="#ffffff" stroke="#e5e7eb" />
              <rect x="8" y="8" rx="3" ry="3" width="12" height="12" fill="#EA580C" />
              <text x="26" y="18" fill="#111827">Gate Controls</text>
            </g>
            <g transform="translate(620,655)">
              <rect rx="12" width="160" height="28" fill="#ffffff" stroke="#e5e7eb" />
              <rect x="8" y="8" rx="3" ry="3" width="12" height="12" fill="#DC2626" />
              <text x="26" y="18" fill="#111827">Freeze Controls</text>
            </g>
          </g>
        </svg>
      </div>
    </div>
  );
}