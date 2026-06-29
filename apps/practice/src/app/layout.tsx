import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { ThemeProvider, DevModeProvider } from "@dentalos/ui";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "DentalOS — Practice",
  description: "Dental practice management for Mauritius",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={jakarta.variable}>
      <body className="min-h-screen font-sans antialiased">
        <ThemeProvider>
          <DevModeProvider>{children}</DevModeProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
