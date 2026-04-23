const nextConfig = {
  output: "export",   // 👈 ADD THIS LINE

  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
};

export default nextConfig;