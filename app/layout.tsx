import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import "katex/dist/katex.min.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#4f46e5" },
    { media: "(prefers-color-scheme: dark)", color: "#020617" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://examlab.tech"),
  title: {
    default: "ExamLab — Platform Ujian Teknis & Olimpiade Sains",
    template: "%s | ExamLab",
  },
  description:
    "Platform ujian teknis terpadu modern berlatensi rendah untuk olimpiade sains (OSN) dan ujian teknis daring dengan dukungan formula LaTeX KaTeX, penyorot kode, dan ketahanan sinkronisasi instan.",
  applicationName: "ExamLab",
  authors: [{ name: "ExamLab Team" }],
  generator: "Next.js 15",
  keywords: [
    "ExamLab",
    "Platform Ujian Teknis",
    "OSN Informatika",
    "OSN Komputer",
    "Olimpiade Sains Nasional",
    "Ujian Daring",
    "CBT Online",
    "LaTeX KaTeX Exam",
    "Technical Examination",
  ],
  creator: "ExamLab",
  publisher: "ExamLab",
  formatDetection: {
    telephone: false,
    date: false,
    email: false,
    address: false,
  },
  alternates: {
    canonical: "https://examlab.tech",
    languages: {
      "id-ID": "https://examlab.tech",
    },
  },
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: "https://examlab.tech",
    siteName: "ExamLab",
    title: "ExamLab — Platform Ujian Teknis & Olimpiade Sains",
    description:
      "Platform ujian daring modern berkinerja tinggi untuk seleksi olimpiade sains dan pengujian teknis institusi.",
  },
  twitter: {
    card: "summary_large_image",
    title: "ExamLab — Platform Ujian Teknis & Olimpiade Sains",
    description:
      "Platform ujian teknis terpadu dengan tipografi matematika KaTeX dan ketahanan sinkronisasi instan.",
    creator: "@examlab",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} min-h-screen bg-slate-50 font-sans text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-50`}
      >
        {children}
      </body>
    </html>
  );
}

