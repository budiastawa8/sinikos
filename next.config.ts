import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Auth/DB routes are request-time; keep classic App Router behavior for MVP.
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
