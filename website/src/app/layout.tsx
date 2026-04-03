import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Writers Assistant — AI-Powered Novel Writing Software",
  description: "Write better novels with AI. A creative writing workspace with an AI writing assistant, story bible, context checking, inline text predictions, and smart editing ideas. Free 7-day trial.",
  keywords: "novel writing software, AI writing assistant, creative writing tool, story bible, novel editor, writing app, fiction writing software, book writing tool, AI editor for writers",
  openGraph: {
    title: "Writers Assistant — AI-Powered Novel Writing Software",
    description: "A creative writing workspace with AI chat, story bible, context checking, and smart editing. Write better novels, faster.",
    type: "website",
    siteName: "Writers Assistant",
  },
  twitter: {
    card: "summary_large_image",
    title: "Writers Assistant — AI-Powered Novel Writing Software",
    description: "A creative writing workspace with AI chat, story bible, context checking, and smart editing.",
  },
  robots: "index, follow",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "name": "Writers Assistant",
              "applicationCategory": "LifestyleApplication",
              "operatingSystem": "Web",
              "description": "AI-powered creative writing workspace for novelists with story bible, context checking, and smart editing.",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD",
                "description": "7-day free trial",
              },
            }),
          }}
        />
      </head>
      <body className="noise-overlay">{children}</body>
    </html>
  );
}
