const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable compression
  compress: true,

  // Production optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },

  // Standalone output for smaller deployment
  output: "standalone",

  // Image optimization
  images: {
    formats: ["image/avif", "image/webp"],
  },

  // Experimental features for bundle size
  experimental: {
    optimizePackageImports: ["@chakra-ui/react", "react-icons"],
  },

  // Add cache headers for static assets
  async headers() {
    return [
      {
        source: "/samples/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/waveforms/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },

  webpack: (config, { isServer }) => {
    // Allow importing .dh and .dhkit files as JSON
    config.module.rules.push(
      {
        test: /\.dhkit$/,
        type: "json",
      },
      {
        test: /\.dh$/,
        type: "json",
      },
    );

    // Optimize bundle splitting for client-side code
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          ...config.optimization.splitChunks,
          cacheGroups: {
            ...config.optimization.splitChunks?.cacheGroups,
            // Split Tone.js into its own chunk
            tone: {
              test: /[\\/]node_modules[\\/]tone[\\/]/,
              name: "tone",
              priority: 10,
              reuseExistingChunk: true,
            },
            // Split Chakra UI into its own chunk
            chakra: {
              test: /[\\/]node_modules[\\/]@chakra-ui[\\/]/,
              name: "chakra",
              priority: 10,
              reuseExistingChunk: true,
            },
            // Split Emotion (used by Chakra) into its own chunk
            emotion: {
              test: /[\\/]node_modules[\\/]@emotion[\\/]/,
              name: "emotion",
              priority: 10,
              reuseExistingChunk: true,
            },
            // Split Framer Motion into its own chunk
            framerMotion: {
              test: /[\\/]node_modules[\\/]framer-motion[\\/]/,
              name: "framer-motion",
              priority: 10,
              reuseExistingChunk: true,
            },
          },
        },
      };
    }

    return config;
  },
};

module.exports = withBundleAnalyzer(nextConfig);
