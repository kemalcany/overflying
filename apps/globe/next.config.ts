import type { NextConfig } from 'next';
import webpack from 'webpack';

const nextConfig: NextConfig = {
  transpilePackages: ['resium', 'cesium'],
  webpack: (config, { isServer }) => {
    // Resium/CesiumJS configuration
    config.plugins.push(
      new webpack.DefinePlugin({
        CESIUM_BASE_URL: JSON.stringify('cesium'),
      })
    );

    // Don't bundle Cesium/Resium on server
    if (isServer) {
      config.externals = [...(config.externals || []), 'cesium', 'resium'];
    }

    return config;
  },
};

export default nextConfig;
