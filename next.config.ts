import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  ...(process.env.GITHUB_PAGES === "true"
    ? { output: "export" as const, basePath: "/v3pro" }
    : {}),
};

export default nextConfig;
