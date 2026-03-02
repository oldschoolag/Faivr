/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configured for Vercel Deployment
  images: { unoptimized: true },
  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "@react-native-async-storage/async-storage": false,
      "pino-pretty": false,
    };
    return config;
  },
};
module.exports = nextConfig;
