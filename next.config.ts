import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  // Archivo de origen del Service Worker
  swSrc: "src/app/sw.ts",
  // Dónde se generará el Service Worker transpilado
  swDest: "public/sw.js",
});

const nextConfig: NextConfig = {
  turbopack: {},
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
};

export default withSerwist(nextConfig);
