import { notFound } from "next/navigation";
import { connection } from "next/server";
import { prisma } from "@/lib/db";
import { getShop } from "@/lib/queries";
import { inr, num } from "@/lib/money";
import { PrintReceiptButton } from "@/components/print-receipt-button";
import Link from "next/link";

export default async function BookingReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  const [booking, shop] = await Promise.all([
    prisma.advanceBooking.findUnique({ where: { id }, include: { payments: { orderBy: { createdAt: "asc" } } } }), getShop(),
  ]);
  if (!booking) notFound();
  return <main className="mx-auto max-w-3xl space-y-4 p-4 sm:p-8"><div className="no-print flex items-center justify-between"><Link href="/bookings" className="text-sm text-royal">← Booking register</Link><PrintReceiptButton /></div>
    <article className="border border-sand bg-white p-6 shadow-sm sm:p-10"><header className="flex items-center justify-between border-b-2 border-gold pb-5"><div><p className="text-xs uppercase tracking-[.2em] text-stone">Advance booking receipt</p><h1 className="mt-1 font-display text-2xl font-bold">{shop.name || "Surya Gold & Diamonds"}</h1><p className="mt-1 text-sm text-stone">{[shop.address, shop.city, shop.state, shop.pincode].filter(Boolean).join(", ")}</p><p className="text-sm text-stone">{shop.phone}</p></div><div className="text-right"><p className="text-xs text-stone">Booking number</p><strong className="font-mono">{booking.bookingNo}</strong><p className="mt-2 text-xs text-stone">Date</p><strong>{booking.date.toLocaleDateString("en-IN")}</strong></div></header>
      <section className="grid gap-4 border-b border-sand py-5 sm:grid-cols-2"><div><p className="text-xs font-bold uppercase text-stone">Customer</p><p className="mt-1 font-semibold">{booking.customerName}</p><p>{booking.customerPhone}</p></div><div><p className="text-xs font-bold uppercase text-stone">Expected delivery</p><p className="mt-1 font-semibold">{booking.expectedDelivery?.toLocaleDateString("en-IN") ?? "To be confirmed"}</p><p className="text-sm">Status: {booking.status}</p></div></section>
      <section className="py-5"><p className="text-xs font-bold uppercase text-stone">Booking details</p><div className="mt-2 grid gap-3 sm:grid-cols-2"><p><span className="text-stone">Item: </span>{booking.description}</p><p><span className="text-stone">Product code: </span>{booking.productCode || "—"}</p><p><span className="text-stone">Category: </span>{booking.category || "—"}</p><p><span className="text-stone">Metal / purity: </span>{booking.metal} · {booking.purity || "—"}</p><p><span className="text-stone">Approximate weight: </span>{num(booking.approximateWeight)} g</p><p><span className="text-stone">Gold rate at booking: </span>{inr(num(booking.goldRate))} / g</p></div>{booking.instructions && <p className="mt-3 text-sm"><span className="text-stone">Instructions: </span>{booking.instructions}</p>}</section>
      <section className="border-t border-sand pt-4"><div className="ml-auto max-w-sm space-y-2 text-sm"><div className="flex justify-between"><span>Booking amount</span><strong>{inr(num(booking.bookingAmount))}</strong></div><div className="flex justify-between"><span>Advance paid</span><strong>{inr(num(booking.advancePaid))}</strong></div><div className="flex justify-between border-t border-sand pt-2 text-base"><span>Balance</span><strong>{inr(num(booking.balanceAmount))}</strong></div><p className="text-xs text-stone">Payment mode: {booking.paymentMode}</p></div></section>
      <footer className="mt-8 flex items-end justify-between border-t border-sand pt-4 text-xs"><div><strong>Served by</strong><p>{booking.billerName} · {booking.employeeCode}</p><p>Counter {booking.counterNumber || "—"}</p></div><div className="min-w-32 text-center">{booking.billerSignature && <img src={booking.billerSignature} alt="Biller signature" className="mx-auto h-10 max-w-32 object-contain" />}<strong className="block border-t border-sand pt-1">Biller signature</strong></div></footer>
      {booking.payments.length > 0 && <p className="mt-5 text-xs text-stone">Payments recorded: {booking.payments.map((payment) => `${inr(num(payment.amount))} by ${payment.mode}`).join("; ")}</p>}
    </article>
  </main>;
}
