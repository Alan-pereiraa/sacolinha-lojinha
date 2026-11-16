import type { NextConfig } from "next";

function hostDoSupabase() {
  try {
    return new URL((process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim().replace(/^["']+|["']+$/g, "")).hostname;
  } catch {
    return "*.supabase.co";
  }
}
const supabaseHost = hostDoSupabase();

const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/object/public/**" },
      { protocol: "http", hostname: "127.0.0.1", port: "54321", pathname: "/storage/v1/object/public/**" },
    ],
  },
  experimental: {
    serverActions: { bodySizeLimit: "8mb" },
  },
};

export default nextConfig;
