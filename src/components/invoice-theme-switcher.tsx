import { InvoiceDocumentStitch } from "@/components/invoice-document-stitch";
import type { InvoiceDoc, ShopDoc } from "@/components/invoice-document-stitch";

export function InvoiceThemeSwitcher({
  invoice,
  shop,
}: {
  invoice: InvoiceDoc;
  shop: ShopDoc;
}) {
  return <InvoiceDocumentStitch invoice={invoice} shop={shop} />;
}
