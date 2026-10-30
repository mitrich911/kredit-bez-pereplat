import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Сборка для Docker: в образ попадает только нужное для запуска.
  output: "standalone",
  poweredByHeader: false,
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
