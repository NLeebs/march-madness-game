// Global CSS
import "./globals.css";
import { AuthProvider } from "@/src/components/Context/AuthProvider";
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
      <body
        suppressHydrationWarning={true}
        className={`${geologica.className} bg-gradient-to-br from-blue-300 from-50% to-blue-50 to-80%`}
      >
        <AuthProvider>{children}</AuthProvider>
        <div id="modal-root"></div>
      </body>
    </html>
  );
}
