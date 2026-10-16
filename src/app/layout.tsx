import type { Metadata } from "next";
import { Caveat, Lora } from "next/font/google";
import "./globals.css";

const lora = Lora({ variable: "--font-lora", subsets: ["latin"] });
const caveat = Caveat({ variable: "--font-caveat", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Judge Mirror",
  description: "See your hackathon submission the way a judge will read it, before the deadline.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${lora.variable} ${caveat.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
