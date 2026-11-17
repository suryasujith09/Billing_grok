import { WebsiteHeader } from "@/components/website-header";
import { WebsiteFooter } from "@/components/website-footer";

export function WebsiteLayout({ children }: { children: React.ReactNode }) {
  return <div className="website"><WebsiteHeader /><main>{children}</main><WebsiteFooter /></div>;
}
