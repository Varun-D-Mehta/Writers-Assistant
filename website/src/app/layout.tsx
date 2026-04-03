import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Writers Assistant — AI-Powered Creative Writing",
  description: "A writing workspace with AI chat, context checking, text prediction, and a structured story bible. Write better novels, faster.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
