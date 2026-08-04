import type { MetadataRoute } from "next";
import { getSiteName } from "@/lib/site";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const siteName = await getSiteName();

  return {
    name: `${siteName} · Cabine de fotos para eventos`,
    short_name: siteName,
    description:
      "Cabine de fotos digital para eventos: QR code, moldura e galeria ao vivo.",
    start_url: "/",
    display: "standalone",
    background_color: "#faf9f7",
    theme_color: "#faf9f7",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
