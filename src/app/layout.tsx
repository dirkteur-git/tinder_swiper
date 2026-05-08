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
    icon: [{ url: "/vondr-icon.png", type: "image/png" }],
    apple: "/vondr-icon.png",
    shortcut: "/vondr-icon.png"
  }
};

export const viewport: Viewport = {
  themeColor: "#F2F5F2",
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
