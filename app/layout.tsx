import './globals.css';

export const metadata = {
  title: 'Sotto le Stelle Manager',
  description: 'Gestionale turni Sotto le Stelle',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}