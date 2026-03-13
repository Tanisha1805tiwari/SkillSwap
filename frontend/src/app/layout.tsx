import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '../styles/globals.css';
import { Providers } from '@/components/Providers';
import { Toaster } from '@/components/ui/toaster';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'SkillSwap — Peer-to-Peer Skill Exchange',
    template: '%s | SkillSwap',
  },
  description: 'Exchange skills with peers through live HD video sessions. Teach what you know, learn what you want.',
  keywords: ['skill exchange', 'peer learning', 'video sessions', 'online tutoring', 'skill swap'],
  openGraph: {
    title: 'SkillSwap — Peer-to-Peer Skill Exchange',
    description: 'Exchange skills through live HD video sessions',
    type: 'website',
  },
  themeColor: '#06b6d4',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="antialiased min-h-screen bg-background">
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
