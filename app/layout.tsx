import type { Metadata } from "next";
import Script from "next/script";
import Nav from "@/components/Nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Snackible B2B Rate Card",
  description: "Build, price and export B2B rate cards for Snackible products.",
};

const themeInitScript = `
try {
  if (localStorage.getItem('theme') === 'dark') {
    document.documentElement.classList.add('dark');
  }
} catch (e) {}
`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-[var(--app-bg)]">
        <Script id="theme-init" strategy="beforeInteractive">
          {themeInitScript}
        </Script>
        <Nav />
        <main className="mx-auto w-full max-w-[1400px] flex-1 px-6 py-6">{children}</main>
      </body>
    </html>
  );
}
