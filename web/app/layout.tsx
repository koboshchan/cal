import LegalFooter from "./components/legal/LegalFooter";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import Nav from "./nav";
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
  title: "Cal — AI Calendar",
  description: "Describe your schedule, get a .ics file",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head><meta charSet="utf-8" /></head>
      <body className="min-h-full flex flex-col">
        <ClerkProvider>
          <Nav />
          <main className="flex-1">{children}</main>
          <LegalFooter />
        </ClerkProvider>
      </body>
    </html>
  );
}
