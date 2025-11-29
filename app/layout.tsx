import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
// Importamos el archivo que creamos en el Paso 1
import AppWalletProvider from "./components/WalletProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Solana Degen Flip",
  description: "Juego de Cara o Cruz en Solana",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      {/* suppressHydrationWarning={true} -> Esto calla el error del 'bis_register' 
         causado por las extensiones de tu navegador.
      */}
      <body className={inter.className} suppressHydrationWarning={true}>
        <AppWalletProvider>
          {children}
        </AppWalletProvider>
      </body>
    </html>
  );
}