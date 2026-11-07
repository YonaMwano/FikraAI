import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "**.magichour.ai" },
      { protocol: "https", hostname: "**.groq.com" },
    ],
  },
};

export default nextConfig;
