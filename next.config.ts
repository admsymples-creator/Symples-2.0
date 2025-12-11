import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
      allowedOrigins: ['localhost:3000', 'app.symples.org'],
    },
  },
  // Melhorar logs de erro
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
};

export default nextConfig;
