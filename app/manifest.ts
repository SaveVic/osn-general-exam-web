import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ExamLab — Platform Ujian Teknis & Olimpiade Sains",
    short_name: "ExamLab",
    description: "Platform ujian daring terpadu untuk seleksi olimpiade sains dan pengujian teknis institusi.",
    start_url: "/",
    display: "standalone",
    background_color: "#020617",
    theme_color: "#4f46e5",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
