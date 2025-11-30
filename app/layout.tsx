import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AppWalletProvider from "./components/WalletProvider";
import "@solana/wallet-adapter-react-ui/styles.css"; // Aseguramos estilos de wallet aquí también

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "RollRush Casino",
  description: "The fastest Solana Dice Game",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      {/* Eliminamos ${racing.variable} porque ya no usamos esa fuente */}
      <body className={inter.className} suppressHydrationWarning={true}>
        <AppWalletProvider>
          {children}
        </AppWalletProvider>
      </body>
    </html>
  );
}