/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@maanak/types'],
  async rewrites() {
    const defaultPort = process.env.NODE_ENV === 'production' ? '4001' : '4000';
    const apiTarget = process.env.INTERNAL_API_URL || `http://127.0.0.1:${defaultPort}`;
    return [
      {
        source: '/api/:path*',
        destination: `${apiTarget}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
