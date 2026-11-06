import { Syne, Hanken_Grotesk, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import Header from '@/components/Header';

const syne = Syne({ subsets: ['latin'], weight: ['700', '800'], variable: '--font-syne' });
const hanken = Hanken_Grotesk({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-hanken' });
const mono = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '600', '700'], variable: '--font-mono' });

export const metadata = {
  title: 'Clyra: campus events at LPU',
  description: 'Find, register for and organize events at Lovely Professional University.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${syne.variable} ${hanken.variable} ${mono.variable}`}>
      <body>
        <Header />
        <main>{children}</main>
        <footer className="mt-16 border-t-2 border-onyx bg-onyx px-6 py-8 text-surface">
          <p className="font-mono text-xs uppercase tracking-wider">Clyra campus events &middot; Lovely Professional University</p>
        </footer>
      </body>
    </html>
  );
}
