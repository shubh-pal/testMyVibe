import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TestMyVibe",
  description: "Generate test flows, run them against your app, and get an audit report with fix prompts.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-neutral-950 text-neutral-100">
        <header className="border-b border-neutral-800">
          <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
            <a href="/" className="font-semibold text-lg tracking-tight">
              🧪 TestMyVibe
            </a>
            <span className="text-xs text-neutral-500">test-case generator & flow auditor</span>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-6 py-8 w-full flex-1">{children}</main>
      </body>
    </html>
  );
}
