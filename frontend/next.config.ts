/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: 'standalone', 
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ui-avatars.com",
      },
      {
        protocol: "https",
        hostname: "api.dicebear.com",
      },
    ],
  },
};

module.exports = nextConfig;