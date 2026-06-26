import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sotto le Stelle Manager',
  description: 'Gestionale turni per pizzeria ristorante',
  manifest: '/manifest.json',
  themeColor: '#111111',
  appleWebApp: {
    capable: true,
    title: 'Sotto le Stelle',
    statusBarStyle: 'black'
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}
