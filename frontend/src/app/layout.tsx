import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "@/components/providers";
import { WorkspaceProvider } from "@/context/workspace-context";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://sem.niranjansah87.com.np"),
  title: {
    default: "Secure Environment Manager",
    template: "%s | Secure Environment Manager",
  },
  description: "Enterprise-grade secrets management and environment synchronization for modern teams.",
  keywords: ["secrets", "environment variables", "security", "devops", "env manager", "secure config"],
  authors: [{ name: "Niranjan Sah", url: "https://niranjansah87.com.np/" }],
  creator: "Niranjan Sah",
  publisher: "Niranjan Sah",
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
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
    other: [
      { rel: "manifest", url: "/site.webmanifest" },
    ],
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://sem.niranjansah87.com.np",
    title: "Secure Environment Manager",
    description: "Enterprise-grade secrets management and environment synchronization for modern teams.",
    siteName: "Secure Environment Manager",
    images: [
      {
        url: "/og_default.png",
        width: 1200,
        height: 630,
        alt: "Secure Environment Manager — self-hosted secrets management",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Secure Environment Manager",
    description: "Enterprise-grade secrets management and environment synchronization for modern teams.",
    creator: "@niranjan_sah",
    images: ["/og_default.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen font-sans antialiased bg-black text-white selection:bg-violet-500/30`}
        suppressHydrationWarning
      >
        <WorkspaceProvider>
          <Providers>
            {children}
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{
                __html: JSON.stringify({
                  "@context": "https://schema.org",
                  "@type": "SoftwareApplication",
                  "name": "Secure Environment Manager",
                  "applicationCategory": "DevOpsApplication",
                  "operatingSystem": "Web",
                  "description": "Enterprise-grade secrets management and environment synchronization for modern teams.",
                  "offers": {
                    "@type": "Offer",
                    "price": "0",
                    "priceCurrency": "USD"
                  }
                }),
              }}
            />
          </Providers>
        </WorkspaceProvider>
      </body>
    </html>
  );
}

