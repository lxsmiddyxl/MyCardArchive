/** @type {import('next').NextConfig} */
const nextConfig = {
  /** Hide Next.js dev toolbar indicators (floating “N” / compile spinner noise). */
  devIndicators: {
    buildActivity: false,
  },
  /**
   * Webpack’s persistent cache may print “Serializing big strings …” to stderr during `next build`.
   * `ignoreWarnings` covers webpack’s warning object path; some Next versions still echo the `<w>` line.
   * Safe to ignore: serialization strategy only, not an application defect.
   */
  webpack: (config) => {
    config.ignoreWarnings ??= [];
    config.ignoreWarnings.push({
      message: /Serializing big strings/,
    });
    // Suppress infrastructure “info” noise (e.g. cache serializer hints) on some Next/webpack versions.
    config.infrastructureLogging = {
      ...config.infrastructureLogging,
      level: "error",
    };
    return config;
  },
  experimental: {
    instrumentationHook: true,
    serverComponentsExternalPackages: ["tesseract.js"],
  },
  async redirects() {
    return [
      { source: "/dashboard/tier", destination: "/tier", permanent: true },
      { source: "/dashboard/scan", destination: "/scan", permanent: true },
      { source: "/dashboard", destination: "/feed", permanent: true },
      { source: "/signup", destination: "/auth/sign-up", permanent: true },
      { source: "/create-account", destination: "/auth/sign-up", permanent: true },
    ];
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
