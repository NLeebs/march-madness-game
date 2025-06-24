// Global CSS
import "./globals.css";
// Fonts
import { Geologica } from "next/font/google";

const geologica = Geologica({ subsets: ["latin"] });

export const metadata = {
  title: "Madness the Game",
  description:
    "Test your Madness skills using real data from your favorite teams",
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <head>
        <title>{metadata.title}</title>
        <meta name="description" content={metadata.description}></meta>
      </head>
      <body suppressHydrationWarning={true} className={geologica.className}>
        {children}
        <div id="modal-root"></div>
      </body>
    </html>
  );
}
