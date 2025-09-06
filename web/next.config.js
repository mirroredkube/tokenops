/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable experimental features for subdomain handling
  experimental: {
    // Allow subdomains to be handled by the same Next.js app
    serverComponentsExternalPackages: [],
  },
  
  // Configure headers for subdomain support
  async headers() {
    return [
      {
        // Apply to all routes
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
    ]
  },
  
  // Configure rewrites for subdomain handling (if needed)
  async rewrites() {
    return [
      // Allow subdomain requests to be handled normally
      {
        source: '/:path*',
        destination: '/:path*',
      },
    ]
  },
}

module.exports = nextConfig
