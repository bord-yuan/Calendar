import type { Metadata } from "next";
import { LoginProvider } from "@/components/login-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Calendar · 一周日程",
  description: "简洁的多用户周日历",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <LoginProvider>{children}</LoginProvider>
      </body>
    </html>
  );
}
