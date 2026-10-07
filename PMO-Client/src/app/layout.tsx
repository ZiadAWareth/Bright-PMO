import type { Metadata } from "next";
import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google";
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

/**
 * The display face, used for headings only — page titles, section headings,
 * modal titles and KPI figures.
 *
 * Body copy and headings sharing one typeface is what made the app read flat:
 * a heading was only "the body font, heavier", so the eye had nothing to
 * anchor on when scanning a screen. A second face with visibly different
 * letterforms gives the hierarchy a real signal rather than a weight change.
 *
 * Space Grotesk specifically, because Bright CRM already uses it for the same
 * job. The two products sitting in the same suite should look related, and
 * matching the display face is the cheapest way to get that.
 *
 * Only the weights that are actually used are requested, so the extra face
 * costs one small woff2 rather than the full family.
 */
const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
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
        className={`${geistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable} antialiased`}
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
