import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HiTsBOT - AI Customer Service Dashboard",
  description: "Next-generation Neobrutalist AI customer service automation hub powered by Baileys & Gemini.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
