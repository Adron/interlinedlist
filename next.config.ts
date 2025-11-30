import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    // Skip prerendering error pages
    missingSuspenseWithCSRBailout: false,
  },
};

export default nextConfig;
