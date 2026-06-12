import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'หางานราชการง่ายๆ',
  description: 'ระบบค้นหาและดึงประกาศงานราชการ บอร์ดงานราชการที่ง่ายที่สุด',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th" className={`${inter.variable}`}>
      <body className="antialiased min-h-screen bg-slate-50 text-slate-900">
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8865019487278078"
          crossOrigin="anonymous"
          strategy="afterInteractive"
          id="adsense-init"
        />
        {children}
      </body>
    </html>
  );
}
