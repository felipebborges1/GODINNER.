import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    const noindex = [{ key: "X-Robots-Tag", value: "noindex, nofollow" }];
    const privateRoutes = ["admin", "api", "auth", "login", "register", "forgot-password", "update-password", "onboarding", "profile", "notifications", "review", "lists", "user", "people", "feed", "search", "restaurant/new"];
    return [
      ...privateRoutes.map(route => ({ source: `/${route}/:path*`, headers: noindex })),
      { source: "/:path*", has: [{ type: "host" as const, value: ".*\\.vercel\\.app" }], headers: noindex },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      {
        protocol: "https",
        hostname: "gzypncrwvzatzzhtehjs.supabase.co",
        pathname: "/storage/v1/object/**",
      },
    ],
  },
};

export default nextConfig;
