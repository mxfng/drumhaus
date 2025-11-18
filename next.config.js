/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // Allow importing .dhkit files as JSON
    config.module.rules.push({
      test: /\.dhkit$/,
      type: "json",
    });
    return config;
  },
};

module.exports = nextConfig;
