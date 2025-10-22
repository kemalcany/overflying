import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'export', // Add this for static export
  images: {
    unoptimized: true, // Required for static export
  },
}

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

export default withBundleAnalyzer(nextConfig)
