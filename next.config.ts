import type { NextConfig } from "next";

// Cabeceras de seguridad para toda la app — el equivalente Next.js/Vercel
// de un archivo `_headers` (esa convención es de Netlify/Cloudflare Pages;
// Vercel no la lee cuando el proyecto es Next.js, así que aquí es donde
// hay que declararlas para que realmente lleguen al navegador).
const CABECERAS_SEGURIDAD = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "geolocation=(), microphone=(), camera=()" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  {
    key: "Content-Security-Policy",
    value: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'",
  },
  // Redundante con el <meta name="robots"> del layout, pero también cubre
  // respuestas que no son HTML (PDFs, imágenes...), que no tienen <head>.
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: CABECERAS_SEGURIDAD,
      },
    ];
  },
};

export default nextConfig;
