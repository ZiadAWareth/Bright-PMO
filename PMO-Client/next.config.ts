import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/dashboard", destination: "/analytics/dashboard", permanent: false },
      { source: "/reports", destination: "/analytics/reports", permanent: false },
    ];
  },
};

export default nextConfig;
