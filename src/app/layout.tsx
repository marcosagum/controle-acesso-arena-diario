import type { Metadata } from "next";
import "./globals.css";
import AppLayout from "@/components/AppLayout";
import Script from 'next/script';

export const metadata: Metadata = {
  title: "Controle de Acesso - Farmasi Arena | GL Events",
  description: "Painel de controle diário e auditoria de entrada e saída operado pelo CCO.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;700;800&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" />
      </head>
      <body className="min-h-full flex flex-col m-0 bg-[#03050c] text-white">
        <Script 
          src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js"
          strategy="beforeInteractive"
        />
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  );
}
