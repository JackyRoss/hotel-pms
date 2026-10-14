import type { Metadata } from "next";
import { getLang } from "@/lib/i18n";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hotel PMS Demo",
  description: "Clickable prototype of a small-hotel property management system",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = await getLang();
  return (
    <html lang={lang === "zh" ? "zh-CN" : "ja"}>
      <body>{children}</body>
    </html>
  );
}
