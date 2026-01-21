import "./globals.css";
import { Providers } from "./providers";

export const metadata = {
  title: "GlassRun",
  description: "Infinite on-chain survival game",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
