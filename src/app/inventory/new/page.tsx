import Link from "next/link";
import { OrnamentForm } from "@/components/forms";
import { Card, PageHeader } from "@/components/ui";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/session";
import { getInventoryCategories } from "@/lib/queries";

export default async function NewOrnamentPage() {
  const [session, categories] = await Promise.all([getSession(), getInventoryCategories()]);
  return (
    <div className="space-y-6 max-w-4xl">
      <Link href="/inventory" className="inline-flex items-center gap-1 text-xs font-semibold text-stone hover:text-ink">
        <ArrowLeft size={14} />
        Back to stock inventory
      </Link>
      <PageHeader
        eyebrow="Inventory Entry"
        title="Add Stock Ornament"
        subtitle="Register new tagged jewellery piece with weights, HUID, making charges, and cost."
      />
      <Card>
        <OrnamentForm isAdmin={session?.role === "admin"} categories={categories} />
      </Card>
    </div>
  );
}
