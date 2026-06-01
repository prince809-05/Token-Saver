import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TokenFlow AI",
  description: "Optimize prompts, clean context, estimate AI token usage, and convert PDFs into Markdown."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
