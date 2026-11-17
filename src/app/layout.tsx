import type { Metadata } from "next";
import { Cormorant_Garamond, Source_Sans_3 } from "next/font/google";
import { AppShell } from "@/components/app-shell";
import "./globals.css";

const display = Cormorant_Garamond({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const ui = Source_Sans_3({
  variable: "--font-ui",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "Twinklestar Gold & Diamonds",
    template: "%s · Twinklestar Gold & Diamonds",
  },
  description: "Discover gold, diamond and silver jewellery with Twinklestar Gold & Diamonds LLP.",
  metadataBase: new URL("https://twinklestargd.com"),
  openGraph: {
    type: "website",
    siteName: "Twinklestar Gold & Diamonds",
    title: "Twinklestar Gold & Diamonds",
    description: "Discover jewellery for the moments that stay with you.",
    images: [{ url: "https://images.unsplash.com/photo-1611652022419-a9419f74343d?auto=format&fit=crop&w=1200&q=85", width: 1200, height: 630, alt: "Jewellery at Twinklestar Gold & Diamonds" }],
  },
  twitter: { card: "summary_large_image", title: "Twinklestar Gold & Diamonds", description: "Discover jewellery for the moments that stay with you." },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${ui.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
