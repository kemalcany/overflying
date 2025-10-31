import path from 'path';
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  output: 'export', // Add this for static export
  images: {
    unoptimized: true, // Required for static export
  },
  compiler: {
    emotion: true,
  },
  experimental: {
    mcpServer: true,
  },
  turbopack: {
    resolveAlias: {
      '@splinetool/react-spline': '@splinetool/react-spline/dist/index.esm.js',
    },
  },
  webpack: config => {
    // Override the exports field resolution
    config.resolve.alias = {
      ...config.resolve.alias,
      '@splinetool/react-spline': path.resolve(
        __dirname,
        'node_modules/@splinetool/react-spline/dist/react-spline.js',
      ),
    };

    // Allow bypassing the package exports field
    config.resolve.exportsFields = [];

    return config;
  },
};

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

export default withBundleAnalyzer(nextConfig);
