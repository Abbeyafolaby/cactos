import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import AuthGate from "./auth-gate";
import { MobileNav, SidebarNav } from "./nav-links";
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
  title: "Cactos",
  description: "Simple rehearsal and member dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-zinc-50 text-zinc-950">
        <AuthGate>
          <div className="flex min-h-screen">
            <aside className="hidden w-64 shrink-0 border-r border-zinc-200 bg-white px-5 py-6 md:block">
              <Link href="/" className="block text-lg font-semibold">
                Cactos
              </Link>
              <SidebarNav />
            </aside>

            <div className="flex min-w-0 flex-1 flex-col">
              <header className="border-b border-zinc-200 bg-white px-4 py-4 md:hidden">
                <Link href="/" className="text-base font-semibold">
                  Cactos
                </Link>
                <MobileNav />
              </header>

              <main className="flex-1 p-6 md:p-10">{children}</main>
            </div>
          </div>
        </AuthGate>
      </body>
    </html>
  );
}
