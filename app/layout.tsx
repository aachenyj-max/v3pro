import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "V3 Pro 整机交互 Demo",
  description: "大主机吸奶器 V3 Pro 漏气检测可交互原型",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Translation extensions can inject attributes on <html> before hydration.
    // Limit suppression to this element so descendant mismatches still surface.
    <html lang="zh-CN" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
