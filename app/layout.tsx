import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Onest } from "next/font/google";
import { AuthProvider } from "@/lib/auth";
import { ToastProvider } from "@/components/Toast";
import "./globals.css";

const onest = Onest({ subsets: ["latin"], variable: "--font-onest" });

export const metadata: Metadata = {
  title: "Winware 360",
  description: "Gestión de equipos, mesa de ayuda, contratos y finanzas de Winware S.A.C.",};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={onest.variable}>
      <body>
        <AuthProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
