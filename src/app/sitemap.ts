import type { MetadataRoute } from "next";
import { site, tools } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["", ...tools.map((t) => t.href), "/metodika", "/api-docs", "/o-proekte"];
  return pages.map((p) => ({
    url: `${site.url}${p}`,
    changeFrequency: "monthly",
    priority: p === "" ? 1 : tools.some((t) => t.href === p) ? 0.9 : 0.5,
  }));
}
