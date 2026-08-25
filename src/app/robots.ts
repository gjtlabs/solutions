import type { MetadataRoute } from "next";

// App interna de gestión, no un sitio público — robots.txt es solo una
// sugerencia (los bots maliciosos lo ignoran), la protección real es la
// autenticación en cada ruta. Esto evita que los buscadores y los bots de
// entrenamiento de LLMs bien portados la indexen o rastreen.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", disallow: "/" },
      { userAgent: "GPTBot", disallow: "/" },
      { userAgent: "ChatGPT-User", disallow: "/" },
      { userAgent: "ClaudeBot", disallow: "/" },
      { userAgent: "Google-Extended", disallow: "/" },
      { userAgent: "PerplexityBot", disallow: "/" },
      { userAgent: "CCBot", disallow: [""] },
    ],
  };
}
