import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  // Пока домен не согласован, индексацию держим закрытой (NEXT_PUBLIC_INDEXING=on открывает).
  const open = process.env.NEXT_PUBLIC_INDEXING === "on";
  return {
    rules: open ? { userAgent: "*", allow: "/", disallow: "/api/" } : { userAgent: "*", disallow: "/" },
    sitemap: `${site.url}/sitemap.xml`,
  };
}
