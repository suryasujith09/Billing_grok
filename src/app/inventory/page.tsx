import Link from "next/link";
import { listOrnaments } from "@/lib/queries";
import { grams, inr, num } from "@/lib/money";
import { CATEGORIES, labelize } from "@/lib/constants";
import { Button, Card, Field, Input, PageHeader, Select } from "@/components/ui";
import { Edit, Plus, Search } from "lucide-react";

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

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Stock Control"
        title="Jewellery Inventory"
        subtitle="Track tagged stock, HUID hallmarking, weights, making charges, and status."
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

      {/* Stock Table */}
      <Card padded={false}>
        {ornaments.length === 0 ? (
          <div className="p-8 text-center text-sm text-stone">
            No stock pieces found matching criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-sand bg-cream/50 text-[11px] font-semibold tracking-wider text-stone uppercase">
                  <th className="px-5 py-3">Tag #</th>
                  <th className="px-5 py-3">Ornament</th>
                  <th className="px-5 py-3">Metal / Purity</th>
                  <th className="px-5 py-3">HUID</th>
                  <th className="px-5 py-3 text-right">Gross Wt</th>
                  <th className="px-5 py-3 text-right">Net Wt</th>
                  <th className="px-5 py-3 text-right">Making</th>
                  <th className="px-5 py-3 text-center">Status</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand/60">
                {ornaments.map((item) => (
                  <tr key={item.id} className="hover:bg-sand/20 transition">
                    <td className="px-5 py-3.5 font-bold tabular text-wine uppercase">
                      {item.tagNo}
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-ink">{item.name}</p>
                      <p className="text-xs text-stone">{labelize(item.category)}</p>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-stone">
                      <span className="font-semibold text-ink">{item.metal}</span> ({item.purity})
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs text-stone">
                      {item.huid || "—"}
                    </td>
                    <td className="px-5 py-3.5 text-right tabular text-stone">
                      {grams(num(item.grossWeight))}
                    </td>
                    <td className="px-5 py-3.5 text-right tabular font-semibold text-ink">
                      {grams(num(item.netWeight))}
                    </td>
                    <td className="px-5 py-3.5 text-right tabular text-xs text-stone">
                      {item.makingType === "PER_GRAM"
                        ? `${inr(num(item.makingValue))}/g`
                        : item.makingType === "PERCENT"
                        ? `${item.makingValue}%`
                        : inr(num(item.makingValue))}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                          item.status === "IN_STOCK"
                            ? "bg-ok/10 text-ok"
                            : "bg-stone/10 text-stone"
                        }`}
                      >
                        {item.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Link
                        href={`/inventory/${item.id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-wine hover:underline"
                      >
                        <Edit size={14} />
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
