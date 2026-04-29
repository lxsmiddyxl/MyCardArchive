/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      { source: "/dashboard/tier", destination: "/tier", permanent: true },
      { source: "/dashboard/scan", destination: "/scan", permanent: true },
      { source: "/dashboard", destination: "/feed", permanent: true },
      { source: "/signup", destination: "/auth/sign-up", permanent: true },
      { source: "/create-account", destination: "/auth/sign-up", permanent: true },
    ];
  },
  experimental: {
    instrumentationHook: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "images.pokemontcg.io",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
