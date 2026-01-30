import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // output: 'standalone' desativado para que "next start" sirva chunks estáticos corretamente (evita 500).
  // Para deploy Docker, ative standalone e use: node .next/standalone/server.js + copiar .next/static e public.
  productionBrowserSourceMaps: true,
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
