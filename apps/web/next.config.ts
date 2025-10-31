import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  // SSR mode enabled - removed output: 'export'
  // images.unoptimized removed - Firebase App Hosting supports Next.js Image Optimization
  compiler: {
    emotion: true,
  },
  experimental: {
    mcpServer: true,
  },
};

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

export default withBundleAnalyzer(nextConfig);
