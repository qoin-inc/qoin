import type { Metadata } from "next";
import '../styles/design.css';
import LiffProvider from "@/components/LiffProvider";
import Menu from '@/components/Menu';

export const metadata: Metadata = {
  title: "el-town",
  description: "町内会・自治会向け電子回覧板アプリ el-town",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&family=Noto+Sans+JP:wght@400;700;900&display=swap" rel="stylesheet" />
        <link rel="icon" href="/icon_el_town.png" />
      </head>
      <body className="antialiased">
        <LiffProvider>
          <Menu />
          {children}
        </LiffProvider>
      </body>
    </html>
  );
}
