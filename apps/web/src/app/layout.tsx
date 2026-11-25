import React from 'react';

export const metadata = {
  title: 'Nexora Field OS — Command Center',
  description: 'Multi-tenant, AI-governed platform for distributed field operations',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#0b1020', color: '#e6edf7' }}>
        {children}
      </body>
    </html>
  );
}
