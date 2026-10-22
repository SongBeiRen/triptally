import type { Metadata } from "next";
import { Inter, Lora } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const display = Lora({
  variable: "--font-display",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TripTally — plan trips together, not over group chat",
  description:
    "Create a trip, share a link, and let your friends vote on dates, destinations and places. TripTally turns the group chat chaos into one clear plan.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${display.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background bg-grain">{children}</body>
    </html>
  );
}
