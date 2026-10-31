import { Bricolage_Grotesque } from 'next/font/google';
import './globals.css';

const font = Bricolage_Grotesque({ subsets: ['latin'] });

export const metadata = { title: 'Titip Video' };
export const viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body className={font.className}>{children}</body>
    </html>
  );
}
