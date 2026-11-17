import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/about", "/collections", "/services", "/contact"].map((path) => ({ url: `https://twinklestargd.com${path}`, changeFrequency: "monthly", priority: path === "" ? 1 : 0.7 }));
}
