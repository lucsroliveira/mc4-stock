import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MC4 Estoque",
    short_name: "MC4 Estoque",
    description: "Sistema de estoque da MC4",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#030712",
    theme_color: "#EB5727",
    icons: [
      {
        src: "/mc4-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/mc4-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}