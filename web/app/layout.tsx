import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import Nav from "./nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cal — AI Calendar",
  description: "Describe your schedule, get a .ics file",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">
        <ClerkProvider>
          <Nav />
          <main id="main-content" tabIndex={-1} className="flex-1">{children}</main>
        </ClerkProvider>
      </body>
    </html>
  );
}
