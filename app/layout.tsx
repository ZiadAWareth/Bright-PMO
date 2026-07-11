import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "./components/Sidebar";
import { Toaster } from 'sonner';
import TokenRefresh from "./components/TokenRefresh";
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
  title: "Wujha - PMO",
  description: "Project management system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <TokenRefresh />
        {children}
        <Toaster 
          richColors 
          position="bottom-right"
          toastOptions={{
            style: {
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '16px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              color: '#374151',
            },
            classNames: {
              toast: 'glass-toast',
              success: 'glass-success',
              error: 'glass-error',
              warning: 'glass-warning',
              info: 'glass-info'
            }
          }}
        />
      </body>
    </html>
  );
}
