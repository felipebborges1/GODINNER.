import type { MetadataRoute } from "next";
import { SITE_URL, isPreview } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  // Brand pages first. Restaurant URLs will be added after their public SSR audit.
  return isPreview ? [] : ["", "/sobre", "/privacy", "/terms"].map(path => ({ url: `${SITE_URL}${path}` }));
}
