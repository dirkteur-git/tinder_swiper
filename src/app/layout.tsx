import type { Metadata, Viewport } from "next";
import "@/styles/globals.css";
import { PwaRegister } from "@/components/PwaRegister";

export const metadata: Metadata = {
  title: "vondr — beslis met één gebaar",
  description:
    "vondr swiper: AI doet de suggestie, jij beslist met één swipe. Voor de Nederlandse bouw en infra.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "vondr"
  },
  icons: {
    icon: [
      { url: "/vondr-icon-180.png", sizes: "180x180", type: "image/png" },
      { url: "/vondr-icon-512.png", sizes: "512x512", type: "image/png" }
    ],
    apple: "/vondr-icon-180.png",
    shortcut: "/vondr-icon-180.png"
  }
};

export const viewport: Viewport = {
  themeColor: "#FFFFFF",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="nl">
      <body>
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
