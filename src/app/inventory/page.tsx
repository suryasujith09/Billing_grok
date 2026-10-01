import Link from "next/link";
import { listOrnaments } from "@/lib/queries";
import { grams, inr, num } from "@/lib/money";
import { CATEGORIES, labelize } from "@/lib/constants";
import { Button, Card, Field, Input, PageHeader, Select } from "@/components/ui";
import { Plus, Search } from "lucide-react";
import { InventoryTagActions } from "@/components/inventory-tag-actions";

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; status?: string }>;
}) {
  const params = await searchParams;
  const q = params.q ?? "";
  const category = params.category ?? "";
  const status = params.status ?? "IN_STOCK";

  const ornaments = await listOrnaments({ q, category, status: status || undefined });

  const totalPieces = ornaments.length;
  const totalNetWeight = ornaments.reduce((sum, item) => sum + num(item.netWeight), 0);
  const totalGrossWeight = ornaments.reduce((sum, item) => sum + num(item.grossWeight), 0);

  const mappedItems = ornaments.map((item) => ({
    id: item.id,
    tagNo: item.tagNo,
    name: item.name,
    category: item.category,
    metal: item.metal,
    purity: item.purity,
    grossWeight: num(item.grossWeight),
    netWeight: num(item.netWeight),
    stoneWeight: num(item.stoneWeight),
    huid: item.huid,
    printCount: item.printCount ?? 0,
    lastPrintedAt: item.lastPrintedAt,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Stock Control & Barcode Tagging"
        title="Jewellery Inventory & Tag Printing"
        subtitle="Track tagged stock, HUID hallmarking, weights, TVS LP 46 Dlite thermal barcode printing, and audit history."
        actions={
          <Link href="/inventory/new">
            <Button variant="primary">
              <Plus size={16} />
              Add Stock Piece
            </Button>
          </Link>
        }
      />

      {/* Filter Bar */}
      <Card>
        <form className="flex flex-wrap items-end gap-3" method="get">
          <div className="w-full sm:flex-1 sm:min-w-[200px]">
            <Field label="Search Stock">
              <Input name="q" defaultValue={q} placeholder="Tag #, name, or HUID..." />
            </Field>
          </div>
          <div className="w-full sm:w-44">
            <Field label="Category">
              <Select name="category" defaultValue={category}>
                <option value="">All Categories</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {labelize(c)}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="w-full sm:w-40">
            <Field label="Status">
              <Select name="status" defaultValue={status}>
                <option value="">All Statuses</option>
                <option value="IN_STOCK">In Stock</option>
                <option value="SOLD">Sold</option>
              </Select>
            </Field>
          </div>
          <div className="flex w-full sm:w-auto items-center gap-2">
            <Button type="submit" variant="secondary" className="flex-1 sm:flex-none">
              <Search size={16} />
              Filter
            </Button>
            {q || category || status !== "IN_STOCK" ? (
              <Link href="/inventory" className="flex-1 sm:flex-none">
                <Button type="button" variant="ghost" className="w-full">
                  Reset
                </Button>
              </Link>
            ) : null}
          </div>
        </form>
      </Card>

      {/* KPI Chips */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
        <div className="rounded-lg border border-sand bg-paper p-3.5 sm:p-4">
          <p className="text-[10px] sm:text-[11px] font-semibold tracking-wider text-stone uppercase">Items Count</p>
          <p className="font-display mt-1 text-xl sm:text-2xl font-semibold text-ink">{totalPieces}</p>
        </div>
        <div className="rounded-lg border border-sand bg-paper p-3.5 sm:p-4">
          <p className="text-[10px] sm:text-[11px] font-semibold tracking-wider text-stone uppercase">Total Net Weight</p>
          <p className="font-display mt-1 text-xl sm:text-2xl font-semibold text-ink">{grams(totalNetWeight)} g</p>
        </div>
        <div className="rounded-lg border border-sand bg-paper p-3.5 sm:p-4">
          <p className="text-[10px] sm:text-[11px] font-semibold tracking-wider text-stone uppercase">Total Gross Weight</p>
          <p className="font-display mt-1 text-xl sm:text-2xl font-semibold text-stone">{grams(totalGrossWeight)} g</p>
        </div>
      </div>

      {/* Tag Printing & Interactive Inventory Table */}
      <InventoryTagActions items={mappedItems} />
    </div>
  );
}
