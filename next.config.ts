import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV !== "production",
});

const nextConfig: NextConfig = {
  turbopack: {
    // Excluir archivos de la raíz que no son parte de la app
    // para reducir el grafo de módulos que Turbopack observa
    resolveExtensions: ['.tsx', '.ts', '.jsx', '.js', '.json'],
  },
  experimental: {
    optimizePackageImports: ['lucide-react', '@heroicons/react', 'date-fns', 'framer-motion', 'recharts'],
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
};

export default withSerwist(nextConfig);
