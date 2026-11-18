import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { connection } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { updateBookingAction } from "@/lib/booking-credit-actions";
import { inr, num } from "@/lib/money";

export default async function EditBookingPage({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "admin") redirect("/bookings");
  const { id } = await params;
  const booking = await prisma.advanceBooking.findUnique({ where: { id } });
  if (!booking) notFound();
  const action = updateBookingAction.bind(null, id);
  const dateValue = booking.expectedDelivery ? new Date(booking.expectedDelivery.getTime() - booking.expectedDelivery.getTimezoneOffset() * 60_000).toISOString().slice(0, 10) : "";
  return <main className="mx-auto max-w-4xl space-y-5 p-4 sm:p-8">
    <div><Link href="/bookings" className="text-sm text-royal">← Booking register</Link><h1 className="mt-2 font-display text-2xl font-bold">Edit advance booking</h1><p className="text-sm text-stone">{booking.bookingNo} · Advance collected: {inr(num(booking.advancePaid))}</p></div>
    <form action={action} className="rounded-xl border border-sand bg-white p-5"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <label className="text-sm">Customer name<input required name="customerName" defaultValue={booking.customerName} className="mt-1 w-full rounded border border-sand p-2" /></label>
      <label className="text-sm">Mobile<input name="customerPhone" defaultValue={booking.customerPhone} className="mt-1 w-full rounded border border-sand p-2" /></label>
      <label className="text-sm">Item description<input required name="description" defaultValue={booking.description} className="mt-1 w-full rounded border border-sand p-2" /></label>
      <label className="text-sm">Product code<input name="productCode" defaultValue={booking.productCode} className="mt-1 w-full rounded border border-sand p-2" /></label>
      <label className="text-sm">Category<input name="category" defaultValue={booking.category} className="mt-1 w-full rounded border border-sand p-2" /></label>
      <label className="text-sm">Metal<select name="metal" defaultValue={booking.metal} className="mt-1 w-full rounded border border-sand p-2">{["GOLD", "SILVER", "PLATINUM"].map((metal) => <option key={metal}>{metal}</option>)}</select></label>
      <label className="text-sm">Approx. weight (g)<input name="approximateWeight" type="number" min="0" step="0.001" defaultValue={num(booking.approximateWeight)} className="mt-1 w-full rounded border border-sand p-2" /></label>
      <label className="text-sm">Purity<input name="purity" defaultValue={booking.purity} className="mt-1 w-full rounded border border-sand p-2" /></label>
      <label className="text-sm">Gold rate / g<input name="goldRate" type="number" min="0" step="0.01" defaultValue={num(booking.goldRate)} className="mt-1 w-full rounded border border-sand p-2" /></label>
      <label className="text-sm">Booking amount<input required name="bookingAmount" type="number" min={num(booking.advancePaid)} step="0.01" defaultValue={num(booking.bookingAmount)} className="mt-1 w-full rounded border border-sand p-2" /></label>
      <label className="text-sm">Expected delivery<input name="expectedDelivery" type="date" defaultValue={dateValue} className="mt-1 w-full rounded border border-sand p-2" /></label>
      <label className="text-sm">Making charges<input name="makingCharges" type="number" min="0" step="0.01" defaultValue={num(booking.makingCharges)} className="mt-1 w-full rounded border border-sand p-2" /></label>
      <label className="text-sm">Tax / GST<input name="taxAmount" type="number" min="0" step="0.01" defaultValue={num(booking.taxAmount)} className="mt-1 w-full rounded border border-sand p-2" /></label>
      <label className="text-sm sm:col-span-2 lg:col-span-3">Special instructions<textarea name="instructions" rows={3} defaultValue={booking.instructions} className="mt-1 w-full rounded border border-sand p-2" /></label>
    </div><p className="mt-3 text-xs text-stone">The booking amount must stay at or above the advance already collected.</p><button className="mt-4 rounded bg-royal-deep px-4 py-2 text-sm font-semibold text-white">Save changes</button></form>
  </main>;
}
