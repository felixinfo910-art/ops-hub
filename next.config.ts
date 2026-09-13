import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @ts-ignore - allowedDevOrigins might not be in the typings yet
  allowedDevOrigins: ['192.168.10.116', 'localhost', '127.0.0.1'],
};

export default nextConfig;
