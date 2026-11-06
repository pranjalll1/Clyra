// The browser only talks to Next.js; /api/* is proxied to Express, so the auth cookie stays same-origin.
const API_URL = process.env.API_URL || 'http://localhost:5000';

export default {
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${API_URL}/api/:path*` }];
  },
};
