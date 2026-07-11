import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable minification to work around a Webpack minify plugin error during production builds
  webpack: (config, { dev }) => {
    if (!dev) {
      // Ensure webpack doesn't attempt to run any minimizers that trigger the error
      if (!config.optimization) config.optimization = {};
      config.optimization.minimize = false;
      config.optimization.minimizer = [];
    }
    return config;
  },
};

export default nextConfig;
