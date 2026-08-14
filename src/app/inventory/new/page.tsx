import Link from "next/link";
import { OrnamentForm } from "@/components/forms";
import { Card, PageHeader } from "@/components/ui";
import { ArrowLeft } from "lucide-react";

export default function NewOrnamentPage() {
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
        <OrnamentForm />
      </Card>
    </div>
  );
}
