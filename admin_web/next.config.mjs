/** @type {import("next").NextConfig} */
const nextConfig = {
  output: "standalone",
  images: {
    qualities: [75, 100],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.sanity.io",
        port: ""
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        port: ""
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
        port: ""
      },
      {
        protocol: "https",
        hostname: "pub-b7fd9c30cdbf439183b75041f5f71b92.r2.dev",
        port: ""
      }
    ]
  },
  async rewrites() {
    // 在 Docker 网络内，通过服务名访问后端
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://backend:8000";
    return {
      beforeFiles: [
        {
          source: "/health",
          destination: `${backendUrl}/health`,
        },
        {
          source: "/docs/:path*",
          destination: `${backendUrl}/docs/:path*`,
        },
        {
          source: "/openapi.json",
          destination: `${backendUrl}/openapi.json`,
        },
        {
          source: "/api/:path*",
          destination: `${backendUrl}/api/:path*`,
        },
      ],
    };
  },
};

export default nextConfig;
