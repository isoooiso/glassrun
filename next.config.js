const nextConfig = {
  output: "export",
  images: { unoptimized: true },
  basePath: "/glassrun",
  assetPrefix: "/glassrun",
  trailingSlash: true,
  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "pino-pretty": false,
      "@react-native-async-storage/async-storage": false,
    };
    return config;
  },
};

export default nextConfig;
