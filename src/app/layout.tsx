import type { Metadata } from "next";
import { Toaster } from "react-hot-toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "منصة الأنشطة الصفية",
  description: "منصة متكاملة لإدارة أنشطة المعلمين واحتساب النقاط ومتابعة الأداء",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body className="antialiased min-h-screen">
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 4000,
            style: {
              fontFamily: "inherit",
              direction: "rtl",
            },
          }}
        />
      </body>
    </html>
  );
}
