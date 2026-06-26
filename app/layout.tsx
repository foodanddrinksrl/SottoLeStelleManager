import './globals.css';
import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'Sotto le Stelle Manager',
  description: 'Gestionale professionale per pizzeria',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, title: 'Sotto le Stelle', statusBarStyle: 'black' }
};

export const viewport: Viewport = { themeColor: '#0e0e0e', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="it"><body>{children}</body></html>;
}
