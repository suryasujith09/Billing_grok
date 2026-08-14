import Link from "next/link";
import { searchCustomers } from "@/lib/queries";
import { Button, Card, Field, Input, PageHeader } from "@/components/ui";
import { Plus, Search, User, Users } from "lucide-react";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const q = params.q ?? "";

  const customers = await searchCustomers(q);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="CRM Directory"
        title="Customers"
        subtitle="Manage customer records, mobile numbers, GSTIN, PAN, and purchase histories."
        actions={
          <Link href="/customers/new">
            <Button variant="primary">
              <Plus size={16} />
              Add Customer
            </Button>
          </Link>
        }
      />

      {/* Filter */}
      <Card>
        <form className="flex flex-wrap items-end gap-3" method="get">
          <div className="w-full sm:flex-1 sm:min-w-[240px]">
            <Field label="Search Customers">
              <Input name="q" defaultValue={q} placeholder="Name, phone number, or PAN..." />
            </Field>
          </div>
          <div className="flex w-full sm:w-auto items-center gap-2">
            <Button type="submit" variant="secondary" className="flex-1 sm:flex-none">
              <Search size={16} />
              Search
            </Button>
            {q ? (
              <Link href="/customers" className="flex-1 sm:flex-none">
                <Button type="button" variant="ghost" className="w-full">
                  Clear
                </Button>
              </Link>
            ) : null}
          </div>
        </form>
      </Card>

      {/* Customer List */}
      <Card padded={false}>
        {customers.length === 0 ? (
          <div className="p-8 text-center text-sm text-stone">
            No customers found matching &quot;{q}&quot;.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-sand bg-cream/50 text-[11px] font-semibold tracking-wider text-stone uppercase">
                  <th className="px-5 py-3">Customer Name</th>
                  <th className="px-5 py-3">Mobile Phone</th>
                  <th className="px-5 py-3">City & Address</th>
                  <th className="px-5 py-3">PAN / GSTIN</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand/60">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-sand/20 transition">
                    <td className="px-5 py-3.5 font-medium text-ink flex items-center gap-2">
                      <User size={16} className="text-gold" />
                      <span>{c.name}</span>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs text-ink">
                      {c.phone}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-stone">
                      {[c.city, c.address].filter(Boolean).join(", ") || "—"}
                    </td>
                    <td className="px-5 py-3.5 text-xs font-mono text-stone">
                      {[c.pan ? `PAN: ${c.pan}` : "", c.gstin ? `GST: ${c.gstin}` : ""]
                        .filter(Boolean)
                        .join(" | ") || "—"}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Link
                        href={`/customers/${c.id}`}
                        className="text-xs font-semibold text-wine hover:underline"
                      >
                        Profile & History
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
