import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Solo afecta `next dev`: permite abrir el servidor de desarrollo desde un celular en la
  // misma red Wi-Fi (http://<IP del computador>:3010). En producción no hace nada.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*"],
};

export default nextConfig;
