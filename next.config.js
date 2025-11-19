/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
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
    return config;
  },
};

module.exports = nextConfig;
