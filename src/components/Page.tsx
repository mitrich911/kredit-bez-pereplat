import Link from "next/link";
import type { ReactNode } from "react";
import { site } from "@/lib/site";

export function JsonLd({ data }: { data: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

export function ToolHeader({ title, lead, path }: { title: string; lead: string; path: string }) {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 pb-4 sm:pt-10">
      <nav aria-label="Навигация" className="text-sm text-muted">
        <Link href="/" className="hover:text-text">Главная</Link> <span aria-hidden>›</span> <span>{title}</span>
      </nav>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h1>
      <p className="mt-3 max-w-3xl text-[17px] text-muted">{lead}</p>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "WebApplication",
              name: `${title} — ${site.name}`,
              url: `${site.url}${path}`,
              applicationCategory: "FinanceApplication",
              operatingSystem: "Any",
              inLanguage: "ru",
              offers: { "@type": "Offer", price: "0", priceCurrency: "RUB" },
              description: lead,
            },
            {
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "Главная", item: site.url },
                { "@type": "ListItem", position: 2, name: title, item: `${site.url}${path}` },
              ],
            },
          ],
        }}
      />
    </div>
  );
}

export function Faq({ items }: { items: { q: string; a: string }[] }) {
  return (
    <section className="mx-auto mt-12 max-w-3xl px-4">
      <h2 className="text-2xl font-bold">Частые вопросы</h2>
      <div className="mt-4 divide-y divide-border rounded-2xl border border-border bg-surface">
        {items.map((it) => (
          <details key={it.q} className="group p-4">
            <summary className="cursor-pointer list-none font-medium">{it.q}</summary>
            <p className="mt-2 leading-relaxed text-muted">{it.a}</p>
          </details>
        ))}
      </div>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: items.map((it) => ({ "@type": "Question", name: it.q, acceptedAnswer: { "@type": "Answer", text: it.a } })),
        }}
      />
    </section>
  );
}

export function Prose({ children }: { children: ReactNode }) {
  return <section className="mx-auto mt-12 max-w-3xl space-y-4 px-4 leading-relaxed [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-text [&_h3]:font-semibold [&_li]:ml-5 [&_li]:list-disc text-[16px]">{children}</section>;
}

export function Wrap({ children }: { children: ReactNode }) {
  return <div className="mx-auto max-w-6xl px-4">{children}</div>;
}
