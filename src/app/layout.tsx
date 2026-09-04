import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { PwaManager } from "@/components/pwa/PwaManager";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#059669",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: "aulaEnsuny - Sistema de Gestión Escolar",
  description: "Sistema de gestión escolar aulaEnsuny. Plataforma educativa integral para estudiantes, docentes y administradores de la Institución Educativa Escuela Normal Superior del Nordeste.",
  applicationName: "aulaEnsuny",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "aulaEnsuny",
  },
  formatDetection: {
    telephone: false,
  },
  keywords: ["ENSUNY", "Escuela Normal Superior del Nordeste", "aulaEnsuny", "Educación", "Sistema Escolar", "LMS", "PWA"],
  openGraph: {
    title: "aulaEnsuny - Sistema de Gestión Escolar",
    description: "Sistema de gestión escolar aulaEnsuny",
    url: "https://aula.ensuny.edu.co",
    siteName: "aulaEnsuny",
    images: [
      {
        url: "/logo_1.svg",
        width: 800,
        height: 600,
      },
    ],
    locale: "es_CO",
    type: "website",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico" },
    ],
    shortcut: "/favicon.ico",
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css"
          crossOrigin="anonymous"
        />
      </head>
      <body className="min-h-full flex flex-col overflow-x-hidden">
        {children}
        <PwaManager />
        <Toaster position="bottom-right" richColors closeButton />
      </body>
    </html>
  );
}
