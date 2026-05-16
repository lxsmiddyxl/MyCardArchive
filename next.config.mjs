const SITE_HOST = "mycardarchive.com";
const EMBED_FRAME_ANCESTORS =
  process.env.MCA_EMBED_ALLOWLIST?.trim()
    ? process.env.MCA_EMBED_ALLOWLIST.split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((e) => (e.startsWith("http") ? e : `https://${e}`))
        .join(" ")
    : `https://${SITE_HOST} https://www.${SITE_HOST}`;

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  compress: true,
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
    optimizePackageImports: ["@tanstack/react-virtual"],
    serverComponentsExternalPackages: ["tesseract.js"],
  },
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: `www.${SITE_HOST}` }],
        destination: `https://${SITE_HOST}/:path*`,
        permanent: true,
      },
      { source: "/dashboard/tier", destination: "/tier", permanent: true },
      { source: "/dashboard/scan", destination: "/scan", permanent: true },
      { source: "/dashboard", destination: "/feed", permanent: true },
      { source: "/signup", destination: "/auth/sign-up", permanent: true },
      { source: "/create-account", destination: "/auth/sign-up", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/favicon.ico",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
      {
        source: "/marketing/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=604800, stale-while-revalidate=86400",
          },
        ],
      },
      {
        source: "/artwork/marketing/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=604800, stale-while-revalidate=86400",
          },
        ],
      },
      {
        source: "/",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=3600, stale-while-revalidate=86400",
          },
        ],
      },
      {
        source: "/features/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=3600, stale-while-revalidate=86400",
          },
        ],
      },
      {
        source: "/embed/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: `frame-ancestors ${EMBED_FRAME_ANCESTORS}`,
          },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Access-Control-Allow-Methods", value: "GET, HEAD, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type" },
        ],
      },
    ];
  },
  images: {
    minimumCacheTTL: 86_400,
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
      {
        protocol: "https",
        hostname: SITE_HOST,
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: `www.${SITE_HOST}`,
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
