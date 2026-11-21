import type { Metadata, Viewport } from "next";
// Fontes servidas pelo próprio site (sem depender do Google Fonts no build)
import "@fontsource-variable/fraunces/index.css";
import "@fontsource-variable/fraunces/wght-italic.css";
import "@fontsource-variable/dm-sans/index.css";
import "@fontsource/cormorant-garamond/latin-600-italic.css";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Sacolinha", template: "%s · Sacolinha" },
  description: "Vitrine online, vendas e acerto de sacolas para quem revende: roupas, cosméticos, semijoias e o que mais você vender.",
};

export const viewport: Viewport = { themeColor: "#A3195B" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
