import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "./components/Sidebar";
import { Toaster } from "@/components/ui/sonner";
import TokenRefresh from "./components/TokenRefresh";
import { ConfirmProvider } from "@/components/ui/confirm-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { themeInitScript } from "@/lib/theme-script";
import '@/lib/axios-config'; // Configure axios globally for cookie authentication

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Bright - PMO",
  description: "Project management system",
  icons: {
    icon: [{ url: "/favicon/bright-favicon.svg", type: "image/svg+xml" }],
    shortcut: "/favicon/bright-favicon.svg",
    apple: "/favicon/bright-favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning: the inline script below mutates <html>'s class
    // before React hydrates, so the server and client markup deliberately differ.
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          <TokenRefresh />
          <ConfirmProvider>{children}</ConfirmProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
