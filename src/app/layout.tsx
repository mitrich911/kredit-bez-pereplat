import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { site, tools } from "@/lib/site";
import { ThemeToggle } from "@/components/ThemeToggle";

const inter = Inter({ variable: "--font-inter", subsets: ["latin", "cyrillic"] });

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: `${site.name} — сколько вы заплатите на самом деле`, template: `%s — ${site.name}` },
  description:
    "Калькуляторы ипотеки, автокредита и крупных покупок, которые показывают полную переплату, скрытые расходы и самый выгодный способ погашения.",
  applicationName: site.name,
  openGraph: { type: "website", locale: "ru_RU", siteName: site.name },
  alternates: { canonical: "/" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f7f4" },
    { media: "(prefers-color-scheme: dark)", color: "#0e1411" },
  ],
};

// Тему ставим до первой отрисовки, чтобы не было вспышки светлого фона.
const themeScript = `try{var t=localStorage.getItem("theme");if(t!=="light"&&t!=="dark"){t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ru" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:p-3 focus:bg-surface">
          К содержимому
        </a>
        <header className="sticky top-0 z-30 border-b border-border bg-bg/90 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
            <Link href="/" className="flex items-center gap-2 font-bold text-[17px] tracking-tight">
              <span aria-hidden className="grid size-8 place-items-center rounded-lg bg-accent text-accent-ink text-sm">₽</span>
              <span>{site.name}</span>
            </Link>
            <nav aria-label="Калькуляторы" className="ml-auto hidden lg:flex gap-1 text-sm">
              {tools.map((t) => (
                <Link key={t.href} href={t.href} className="rounded-lg px-3 py-2 text-muted hover:bg-surface-2 hover:text-text">
                  {t.short}
                </Link>
              ))}
            </nav>
            <div className="ml-auto lg:ml-0">
              <ThemeToggle />
            </div>
          </div>
          <nav aria-label="Калькуляторы" className="lg:hidden overflow-x-auto border-t border-border">
            <div className="mx-auto flex max-w-6xl gap-1 px-4 py-2 text-sm whitespace-nowrap">
              {tools.map((t) => (
                <Link key={t.href} href={t.href} className="rounded-full border border-border px-3 py-1.5 text-muted">
                  {t.short}
                </Link>
              ))}
            </div>
          </nav>
        </header>
        <main id="main" className="flex-1">{children}</main>
        <footer className="mt-16 border-t border-border">
          <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 text-sm text-muted sm:grid-cols-3">
            <div>
              <p className="font-semibold text-text">{site.name}</p>
              <p className="mt-2">Независимые расчёты. Мы не банк и не продаём кредиты. Результаты — оценка по введённым данным, точные условия указаны в вашем договоре.</p>
            </div>
            <ul className="space-y-2">
              {tools.map((t) => (
                <li key={t.href}><Link href={t.href} className="hover:text-text">{t.title}</Link></li>
              ))}
            </ul>
            <ul className="space-y-2">
              <li><Link href="/metodika" className="hover:text-text">Методика расчётов</Link></li>
              <li><Link href="/api-docs" className="hover:text-text">API для разработчиков и ИИ-агентов</Link></li>
              <li><Link href="/o-proekte" className="hover:text-text">О проекте и реклама</Link></li>
            </ul>
          </div>
        </footer>
      </body>
    </html>
  );
}
