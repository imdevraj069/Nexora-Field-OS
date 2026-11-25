import React from 'react';
import type { Metadata, Viewport } from 'next';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import './globals.css';
import { PwaRegister } from '../components/ui/PwaRegister';

export const metadata: Metadata = {
  title: 'Nexora Field OS — Operations Platform',
  description: 'Multi-tenant, shard-routed, AI-governed platform for distributed field operations',
  manifest: '/manifest.json',
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Nexora',
  },
};

export const viewport: Viewport = {
  themeColor: '#f97316',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light" className="scroll-smooth" suppressHydrationWarning>
      <body className="min-h-screen antialiased font-sans selection:bg-orange-500/20 selection:text-orange-600">
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
