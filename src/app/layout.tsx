import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "UMIKO — Dive Beyond the Ordinary",
  description:
    "An immersive underwater experience where motion, light, and the ocean respond to you. A luminous blue koi swims through a real-time 3D deep-blue world, following your cursor or finger.",
  keywords: [
    "interactive experience",
    "3D website",
    "underwater",
    "koi fish",
    "WebGL",
    "React Three Fiber",
    "GLSL",
  ],
  authors: [{ name: "UMIKO" }],
  openGraph: {
    title: "UMIKO — Dive Beyond the Ordinary",
    description:
      "An immersive experience where motion, light, and the ocean respond to you.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} bg-black font-sans text-white antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
