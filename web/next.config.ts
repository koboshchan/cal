import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    // Default is 10MB; a new-schedule request can carry several photo
    // attachments, so allow more room before the proxy rejects the body.
    proxyClientMaxBodySize: 30 * 1024 * 1024,
  },
};

export default nextConfig;
