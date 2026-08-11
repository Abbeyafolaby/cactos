import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import AuthGate from "./auth-gate";
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

const navigation = [
  { name: "Members", href: "/members" },
  { name: "Rehearsals", href: "/rehearsals" },
  { name: "Transactions", href: "/transactions" },
  { name: "Dashboard", href: "/" },
];

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
              <nav className="mt-8 space-y-1">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="block rounded-md px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-950"
                  >
                    {item.name}
                  </Link>
                ))}
              </nav>
            </aside>

            <div className="flex min-w-0 flex-1 flex-col">
              <header className="border-b border-zinc-200 bg-white px-4 py-4 md:hidden">
                <Link href="/" className="text-base font-semibold">
                  Cactos
                </Link>
                <nav className="mt-4 flex gap-2 overflow-x-auto">
                  {navigation.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      className="rounded-md px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950"
                    >
                      {item.name}
                    </Link>
                  ))}
                </nav>
              </header>

              <main className="flex-1 p-6 md:p-10">{children}</main>
            </div>
          </div>
        </AuthGate>
      </body>
    </html>
  );
}
