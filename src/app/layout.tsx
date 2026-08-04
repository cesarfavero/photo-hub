import type { Metadata, Viewport } from "next";
import { Geist_Mono, Inter, Sora } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { getSiteName } from "@/lib/site";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl =
  process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.NEXT_PUBLIC_SITE_URL ?? "https://photo-hub-alpha.vercel.app";

export async function generateMetadata(): Promise<Metadata> {
  const siteName = await getSiteName();
  const siteTitle = `${siteName} · Cabine de fotos para eventos`;

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: siteTitle,
      template: `%s · ${siteName}`,
    },
    description:
      "Cabine de fotos digital para eventos: escaneie o QR code, escolha a moldura e publique sua foto na galeria ao vivo. Sem aplicativo, sem cadastro.",
    applicationName: siteName,
    keywords: [
      "cabine de fotos",
      "foto 360",
      "photo booth",
      "fotos para eventos",
      "galeria ao vivo",
      "QR code",
      "cabine de fotos digital",
      "molduras",
    ],
    authors: [{ name: siteName }],
    creator: siteName,
    publisher: siteName,
    alternates: {
      canonical: "/",
    },
    icons: {
      icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
      apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
    },
    openGraph: {
      type: "website",
      locale: "pt_BR",
      siteName,
      title: siteTitle,
      description:
        "QR code + moldura + foto + galeria ao vivo. Tudo funciona direto no celular dos convidados.",
      url: siteUrl,
    },
    twitter: {
      card: "summary_large_image",
      title: siteTitle,
      description:
        "QR code + moldura + foto + galeria ao vivo. Tudo funciona direto no celular dos convidados.",
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#faf9f7",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${inter.variable} ${sora.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
