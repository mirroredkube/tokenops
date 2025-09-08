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
          viewBox="0 0 1200 480"
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
          <ellipse cx="600" cy="235" rx="410" ry="210" fill="url(#halo)" filter="url(#soft)" />

          {/* left → kernel */}
          <g stroke="#cbd5e1" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.95">
            <path d="M280 235 H515" markerEnd="url(#arrow)">
              <animate attributeName="stroke-dasharray" values="1,240; 240,1" dur="2.6s" repeatCount="indefinite" />
              <animate attributeName="stroke-dashoffset" values="240;0" dur="2.6s" repeatCount="indefinite" />
            </path>
            {/* kernel → right */}
            <path d="M685 235 H920" markerEnd="url(#arrow)">
              <animate attributeName="stroke-dasharray" values="1,240; 240,1" dur="2.6s" repeatCount="indefinite" />
              <animate attributeName="stroke-dashoffset" values="0;240" dur="2.6s" repeatCount="indefinite" />
            </path>
          </g>

          {/* kernel */}
          <g>
            <circle cx="600" cy="235" r="118" fill="white" />
            <circle cx="600" cy="235" r="116" fill="url(#halo)" />
            <circle cx="600" cy="235" r="116" fill="none" stroke="url(#glow)" strokeWidth="3" />
            <text x="600" y="228" fontSize="24" textAnchor="middle" fill="#0a0a0a" fontFamily="Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial">Policy</text>
            <text x="600" y="256" fontSize="24" textAnchor="middle" fill="#0a0a0a" fontFamily="Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial">Kernel</text>

            {/* orbiters */}
            <circle r="5" fill="#10B981">
              <animateMotion dur="7s" repeatCount="indefinite" path="M600,235 m-155,0 a155,155 0 1,0 310,0 a155,155 0 1,0 -310,0" />
            </circle>
            <circle r="5" fill="#6366F1">
              <animateMotion dur="8.5s" repeatCount="indefinite" path="M600,235 m-132,0 a132,132 0 1,0 264,0 a132,132 0 1,0 -264,0" />
            </circle>
            <circle r="5" fill="#A855F7">
              <animateMotion dur="6s" repeatCount="indefinite" path="M600,235 m-100,0 a100,100 0 1,0 200,0 a100,100 0 1,0 -200,0" />
            </circle>
          </g>

          {/* headings */}
          <g fontSize="18" fill="#0a0a0a" fontFamily="Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial" opacity="0.95">
            <text x="330" y="185" textAnchor="middle">Regime plug-ins</text>
            <text x="870" y="185" textAnchor="middle">Ledger adapters</text>
          </g>

          {/* left badges */}
          <g fontSize="16" fontFamily="Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial">
            <g transform="translate(270,205)">
              <rect rx="14" width="122" height="34" fill="#ffffff" stroke="#e5e7eb" />
              <circle cx="18" cy="17" r="6" fill="#10B981" />
              <text x="32" y="22" fill="#111827">MiCA</text>
            </g>
            <g transform="translate(270,245)">
              <rect rx="14" width="162" height="34" fill="#ffffff" stroke="#e5e7eb" />
              <circle cx="18" cy="17" r="6" fill="#3B82F6" />
              <text x="32" y="22" fill="#111827">Travel Rule</text>
            </g>
            <g transform="translate(270,285)">
              <rect rx="14" width="216" height="34" fill="#ffffff" stroke="#e5e7eb" />
              <circle cx="18" cy="17" r="6" fill="#A78BFA" />
              <text x="32" y="22" fill="#111827">EU / US / SG packs</text>
            </g>
          </g>

          {/* right badges */}
          <g fontSize="16" fontFamily="Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial">
            <g transform="translate(820,205)">
              <rect rx="14" width="112" height="34" fill="#ffffff" stroke="#e5e7eb" />
              <rect x="12" y="10" rx="4" ry="4" width="14" height="14" fill="#2563EB" />
              <text x="34" y="22" fill="#111827">XRPL</text>
            </g>
            <g transform="translate(820,245)">
              <rect rx="14" width="156" height="34" fill="#ffffff" stroke="#e5e7eb" />
              <rect x="12" y="10" rx="4" ry="4" width="14" height="14" fill="#EA580C" />
              <text x="34" y="22" fill="#111827">Ethereum</text>
            </g>
            <g transform="translate(820,285)">
              <rect rx="14" width="172" height="34" fill="#ffffff" stroke="#e5e7eb" />
              <rect x="12" y="10" rx="4" ry="4" width="14" height="14" fill="#9333EA" />
              <text x="34" y="22" fill="#111827">Hyperledger</text>
            </g>
          </g>
        </svg>
      </div>

      {/* Single, controlled tagline below (not inside SVG) */}
      <div className="mt-4 text-center text-sm md:text-base text-neutral-500">
        Evaluate → Enforce → Evidence
      </div>
    </div>
  );
}