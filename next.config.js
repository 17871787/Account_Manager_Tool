/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: process.env.NODE_ENV === 'production' 
          ? 'https://am-copilot.vercel.app/api/:path*'
          : 'http://localhost:3000/api/:path*',
      },
    ]
  },
}

module.exports = nextConfig