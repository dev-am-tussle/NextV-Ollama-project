import type React from "react";
import type { Metadata } from "next";
// import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next";
import { Suspense } from "react";
import "./globals.css";

import { AppProvider } from "@/components/context/AppContext";

export const metadata: Metadata = {
  title: "OpenWebUI - AI Chat Interface",
  description:
    "A modern, responsive chat interface for Ollama-powered AI models",
  generator: "v0.app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={"s"}>
        <AppProvider>
          <Suspense fallback={null}>{children}</Suspense>
        </AppProvider>
        <Analytics />
      </body>
    </html>
  );
}
