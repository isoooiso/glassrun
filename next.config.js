/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  images: { unoptimized: true },
  basePath: "/glassrun",
  assetPrefix: "/glassrun",
  trailingSlash: true,
};

export default nextConfig;
