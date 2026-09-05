import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AppStoreProvider } from '@/lib/store/app-store';

export const metadata: Metadata = {
  title: 'Мы Вместе — Приложение для пар',
  description: 'Общий сейф документов, список желаний с автопарсингом и задачи для двоих в стиле Apple iOS',
  manifest: '/manifest.json',
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Мы Вместе',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <script src="https://telegram.org/js/telegram-web-app.js"></script>
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased selection:bg-primary/20">
        <AppStoreProvider>{children}</AppStoreProvider>
      </body>
    </html>
  );
}
