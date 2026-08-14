import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { num } from "@/lib/money";
import { OrnamentForm } from "@/components/forms";
import { Card, PageHeader } from "@/components/ui";
import { ArrowLeft } from "lucide-react";

export default async function EditOrnamentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ornament = await prisma.ornament.findUnique({ where: { id } });

  if (!ornament) {
    notFound();
  }

  const formattedItem = {
    ...ornament,
    grossWeight: num(ornament.grossWeight),
    stoneWeight: num(ornament.stoneWeight),
    netWeight: num(ornament.netWeight),
    makingValue: num(ornament.makingValue),
    wastagePercent: num(ornament.wastagePercent),
    stoneCharge: num(ornament.stoneCharge),
    hallmarkCharge: num(ornament.hallmarkCharge),
    otherCharge: num(ornament.otherCharge),
    costPrice: ornament.costPrice != null ? num(ornament.costPrice) : null,
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <Link href="/inventory" className="inline-flex items-center gap-1 text-xs font-semibold text-stone hover:text-ink">
        <ArrowLeft size={14} />
        Back to stock inventory
      </Link>
      <PageHeader
        eyebrow="Stock Update"
        title={`Edit Stock ${ornament.tagNo}`}
        subtitle="Update ornament attributes, weight measurements, or making rates."
      />
      <Card>
        <OrnamentForm item={formattedItem} />
      </Card>
    </div>
  );
}
