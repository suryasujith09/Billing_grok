import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: "*", allow: ["/", "/about", "/collections", "/services", "/contact"], disallow: ["/login", "/software/", "/dashboard", "/billing", "/customers", "/employees", "/inventory", "/invoices", "/reports", "/settings", "/attendance", "/bookings", "/credit-notes", "/api/"] }], sitemap: "https://twinklestargd.com/sitemap.xml" };
}
