import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Inter is a Phase B design decision — the prototype uses the system font stack.
// Inter is chosen for readability on non-Apple hardware and SaaS-standard appearance.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "COB Flow",
  description: "Decision-support for coordination of benefits.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased`}>{children}</body>
    </html>
  );
}
