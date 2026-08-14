import Link from "next/link";
import { CustomerForm } from "@/components/forms";
import { Card, PageHeader } from "@/components/ui";
import { ArrowLeft } from "lucide-react";

export default function NewCustomerPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <Link href="/customers" className="inline-flex items-center gap-1 text-xs font-semibold text-stone hover:text-ink">
        <ArrowLeft size={14} />
        Back to customer directory
      </Link>
      <PageHeader
        eyebrow="CRM Entry"
        title="Add Customer"
        subtitle="Register customer details for quick counter lookup, invoicing, and tax compliance."
      />
      <Card>
        <CustomerForm />
      </Card>
    </div>
  );
}
