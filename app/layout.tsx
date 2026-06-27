import type { Metadata } from "next";
import '../styles/design.css';

export const metadata: Metadata = {
  title: "el-town",
  description: "町内会・自治会向け電子回覧板アプリ el-town",
};

import LiffProvider from "@/components/LiffProvider";
import InitialMenu from "@/components/InitialMenu";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <head>
        <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&family=Noto+Sans+JP:wght@400;700;900&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased">
        <LiffProvider>

          <InitialMenu />
        </LiffProvider>
      </body>
    </html>
  );
}
