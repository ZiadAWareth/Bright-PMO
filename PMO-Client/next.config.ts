import type { NextConfig } from "next";

/**
 * The client is a pure frontend and is not connected to a backend yet, so
 * nothing is forwarded anywhere. When the integration starts, its API address
 * is configured here.
 */
const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/dashboard", destination: "/analytics/dashboard", permanent: false },
      { source: "/reports", destination: "/analytics/reports", permanent: false },
    ];
  },
};

export default nextConfig;
