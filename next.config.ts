import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";
import os from "os";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
});

// Coleta dinamicamente os IPs de rede da máquina (Tailscale, Wi-Fi/Ethernet local, etc.)
const devOrigins: string[] = ["localhost", "127.0.0.1", "100.124.19.16", "192.168.1.114", "*.ts.net"];
try {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === "IPv4" && !iface.internal) {
        if (!devOrigins.includes(iface.address)) {
          devOrigins.push(iface.address);
        }
      }
    }
  }
} catch {
  // Ignora caso não tenha permissão de leitura de rede
}

const nextConfig: NextConfig = {
  allowedDevOrigins: devOrigins,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default withPWA(nextConfig);

