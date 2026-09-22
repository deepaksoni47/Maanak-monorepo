import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MAANAK (मानक) — OIML R-76 Legal Metrology",
    short_name: "MAANAK",
    description:
      "Offline-First Progressive Web App for Non-Automatic Weighing Instruments Legal Metrology Verification and ISO/IEC 17025 Calibration.",
    start_url: "/bench",
    display: "standalone",
    background_color: "#090d16",
    theme_color: "#0284c7",
    orientation: "portrait",
    categories: ["utilities", "productivity", "business"],
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
