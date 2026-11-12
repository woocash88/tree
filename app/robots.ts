import type { MetadataRoute } from "next";
import { ADRES_SERWISU } from "@/lib/sciezki";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: "/", disallow: ["/admin/", "/d/", "/profil/", "/logowanie/", "/rejestracja/"] }, sitemap: `${ADRES_SERWISU}/sitemap.xml` };
}
