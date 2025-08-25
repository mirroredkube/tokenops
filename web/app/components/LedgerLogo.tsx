interface LedgerLogoProps {
  type: 'XRPL' | 'HEDERA' | 'ETHEREUM'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export default function LedgerLogo({ type, size = 'md', className = '' }: LedgerLogoProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  }

  const baseClasses = `${sizeClasses[size]} ${className}`

  switch (type) {
    case "XRPL":
      // Simplified official XRP logo: white "X" on black circle
      return (
        <div className={`${baseClasses} flex items-center justify-center`}>
          <svg
            width="800px"
            height="800px"
            viewBox="0 0 32 32"
            xmlns="http://www.w3.org/2000/svg"
          >
            <g fill="none">
              <circle cx="16" cy="16" r="16" fill="#23292F" />

              <path
                d="M23.07 8h2.89l-6.015 5.957a5.621 5.621 0 01-7.89 0L6.035 8H8.93l4.57 4.523a3.556 3.556 0 004.996 0L23.07 8zM8.895 24.563H6l6.055-5.993a5.621 5.621 0 017.89 0L26 24.562h-2.895L18.5 20a3.556 3.556 0 00-4.996 0l-4.61 4.563z"
                fill="#FFF"
              />
            </g>
          </svg>
        </div>
      );

    case "HEDERA":
      // Hedera logo: black circle + H with two bars
      return (
        <div className={`${baseClasses} flex items-center justify-center`}>
          <svg
            viewBox="0 0 512 512"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full"
          >
            <circle cx="256" cy="256" r="256" fill="#000" />
            {/* H verticals */}
            <rect x="160" y="130" width="40" height="252" fill="#fff" />
            <rect x="312" y="130" width="40" height="252" fill="#fff" />
            {/* H bars */}
            <rect x="160" y="200" width="192" height="32" fill="#fff" />
            <rect x="160" y="280" width="192" height="32" fill="#fff" />
          </svg>
        </div>
      );

    case "ETHEREUM":
      // Ethereum prism
      return (
        <div className={`${baseClasses} flex items-center justify-center`}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 256 417"
            className="w-full h-full"
          >
            <polygon
              fill="#343434"
              points="127.9,0 124.5,11.7 124.5,285.4 127.9,288.8 255.8,209.6"
            />
            <polygon
              fill="#8C8C8C"
              points="127.9,0 0,209.6 127.9,288.8 127.9,154.1"
            />
            <polygon
              fill="#3C3C3B"
              points="127.9,312.5 125.9,314.9 125.9,416.6 127.9,422.5 255.9,233.3"
            />
            <polygon fill="#8C8C8C" points="127.9,422.5 127.9,312.5 0,233.3" />
            <polygon
              fill="#141414"
              points="127.9,288.8 255.8,209.6 127.9,154.1"
            />
            <polygon fill="#393939" points="0,209.6 127.9,288.8 127.9,154.1" />
          </svg>
        </div>
      );

    default:
      return (
        <div
          className={`${baseClasses} flex items-center justify-center bg-gray-500 rounded-lg`}
        >
          <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-3/4 h-3/4 text-white"
          >
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
          </svg>
        </div>
      );
  }
}