import type { Metadata } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import { Sidebar } from "@/components/sidebar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Iris",
  description: "Bridge-health console for the constellation's Obsidian vault bridge",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="flex min-h-screen antialiased">
        <Sidebar />
        <main className="flex-1 overflow-auto p-8">{children}</main>
      </body>
    </html>
  );
}
