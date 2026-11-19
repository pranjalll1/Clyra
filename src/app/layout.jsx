

import './globals.css';

import Header from '@/components/Header';
import { Toaster } from 'sonner';
import { ConfirmProvider } from '@/components/ConfirmDialog';
import Footer from '@/components/Footer';

import '@fontsource/syne/700.css';
import '@fontsource/syne/800.css';
import '@fontsource/hanken-grotesk/400.css';
import '@fontsource/hanken-grotesk/500.css';
import '@fontsource/hanken-grotesk/600.css';
import '@fontsource/hanken-grotesk/700.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/600.css';
import '@fontsource/jetbrains-mono/700.css';



export const metadata = {
  title: 'Clyra: campus events at LPU',
  description:
    'Find, register for and organize events at Lovely Professional University.',
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en">
      <body>
        <ConfirmProvider>
          <Header />

          <main>{children}</main>

          <Footer className="mt-16 border-t-2 border-onyx bg-onyx px-6 py-8 text-surface">
            <p className="font-mono text-xs uppercase tracking-wider">
              Clyra campus events &middot; Lovely Professional University
            </p>
          </Footer>

          <Toaster position="top-right" richColors />
        </ConfirmProvider>
      </body>
    </html>
  );
}
