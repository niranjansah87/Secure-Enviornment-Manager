import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Documentation & Developer Architecture",
  description:
    "Comprehensive technical documentation for Secure Environment Manager: AES-256-GCM envelope encryption hierarchy (MEK to KEK to DEK), CLI installation, REST API endpoints, and CI/CD automation.",
  keywords: [
    "secrets manager documentation",
    "aes-256-gcm envelope encryption",
    "key hierarchy mek kek dek",
    "sem cli installation",
    "secrets management api",
    "tamper-proof audit logs",
    "self-hosted dotenv sync",
  ],
  alternates: {
    canonical: "https://sem.niranjansah87.com.np/docs",
  },
  openGraph: {
    type: "article",
    locale: "en_US",
    url: "https://sem.niranjansah87.com.np/docs",
    title: "SEM Documentation: Cryptography, CLI & Architecture",
    description:
      "Deep-dive guide into envelope encryption, AAD integrity validation, CLI setup, and REST API integration.",
    siteName: "Secure Environment Manager",
    images: [
      {
        url: "/og_default.png",
        width: 1200,
        height: 630,
        alt: "Secure Environment Manager Documentation",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SEM Documentation: Cryptography, CLI & Architecture",
    description:
      "Deep-dive guide into envelope encryption, AAD integrity validation, CLI setup, and REST API integration.",
    creator: "@niranjan8790",
    images: ["/og_default.png"],
  },
};

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "TechArticle",
            "@id": "https://sem.niranjansah87.com.np/docs#article",
            headline: "Secure Environment Manager Technical Documentation & Cryptographic Architecture",
            description:
              "Comprehensive guide to SEM V2: AES-256-GCM envelope encryption, key hierarchy (MEK to KEK to DEK), CLI installation, and REST API integration.",
            inLanguage: "en-US",
            url: "https://sem.niranjansah87.com.np/docs",
            author: {
              "@type": "Person",
              "@id": "https://sem.niranjansah87.com.np/#person",
              name: "Niranjan Sah",
              url: "https://niranjansah87.com.np/",
            },
            publisher: {
              "@type": "Organization",
              "@id": "https://sem.niranjansah87.com.np/#organization",
              name: "Secure Environment Manager",
              url: "https://sem.niranjansah87.com.np",
              logo: "https://sem.niranjansah87.com.np/logo.png",
            },
            breadcrumb: {
              "@type": "BreadcrumbList",
              itemListElement: [
                {
                  "@type": "ListItem",
                  position: 1,
                  name: "Home",
                  item: "https://sem.niranjansah87.com.np/",
                },
                {
                  "@type": "ListItem",
                  position: 2,
                  name: "Documentation",
                  item: "https://sem.niranjansah87.com.np/docs",
                },
              ],
            },
          }),
        }}
      />
      {children}
    </>
  );
}
