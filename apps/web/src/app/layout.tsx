import React from 'react';
import '@fontsource/space-grotesk/600.css';
import '@fontsource/space-grotesk/700.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';
import './globals.css';

export const metadata = {
  title: 'Nexora Field OS — Operations Command Center',
  description: 'Multi-tenant, shard-routed, AI-governed platform for distributed field operations',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#080a0f] text-slate-100 antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
