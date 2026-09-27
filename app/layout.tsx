import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ЖерКөз — панель земельного инспектора",
  description: "Цифровой мониторинг земель г. Тараз: панель инспектора и Telegram-бот для жителей",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ru" className="h-full antialiased">
      <body className="h-full">{children}</body>
    </html>
  );
}
