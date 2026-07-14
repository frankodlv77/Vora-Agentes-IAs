import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ARIA Demo — Vora IA',
  description: 'Probá cómo funciona un agente de IA de Vora en WhatsApp',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
