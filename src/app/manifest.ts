import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Digital DiagPro Pilot",
    short_name: "DiagPro",
    description: "نظام إدارة مركز التشخيص الاحترافي",
    start_url: "/",
    display: "standalone",
    background_color: "#0c0d0f",
    theme_color: "#ffd100",
    lang: "ar",
    dir: "rtl",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}
