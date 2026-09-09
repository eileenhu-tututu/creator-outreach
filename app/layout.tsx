import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://creator-outreach-bd.whole-sloth-5122.chatgpt.site'),
  title: 'Creator Outreach — TikTok Shop BD Copilot',
  description: 'Turn creator video transcripts into specific, source-backed TikTok Shop outreach in seconds.',
  openGraph: {
    title: 'Creator Outreach — TikTok Shop BD Copilot',
    description: 'Turn creator video transcripts into specific, source-backed TikTok Shop outreach in seconds.',
    images: [{ url: '/og.png', width: 1734, height: 907 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Creator Outreach — TikTok Shop BD Copilot',
    description: 'Turn creator video transcripts into specific, source-backed TikTok Shop outreach in seconds.',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
