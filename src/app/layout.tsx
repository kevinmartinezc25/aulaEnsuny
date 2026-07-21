import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "aulaEnsuny - Sistema de Gestión Escolar",
  description: "Sistema de gestión escolar aulaEnsuny. Plataforma educativa integral para estudiantes, docentes y administradores de la Institución Educativa Escuela Normal Superior del Nordeste.",
  keywords: ["ENSUNY", "Escuela Normal Superior del Nordeste", "aulaEnsuny", "Educación", "Sistema Escolar", "LMS"],
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
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
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
        <Toaster position="bottom-right" richColors closeButton />
      </body>
    </html>
  );
}
