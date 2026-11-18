"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "./db";
import { getSession } from "./session";

async function employeeContext() {
  const session = await getSession();
  if (!session) throw new Error("Sign in is required.");
  if (!session.employeeId) throw new Error("Use an individual employee login to create or adjust bookings and credits.");
  const employee = await prisma.employee.findUnique({ where: { id: session.employeeId }, include: { counter: true } });
  if (!employee || employee.status !== "ACTIVE") throw new Error("Active employee access is required.");
  return { session, employee };
}

function createNumber(prefix: string) {
  const date = new Date();
  const day = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
  return `${prefix}-${day}-${randomBytes(3).toString("hex").toUpperCase()}`;
}

export async function createBookingAction(formData: FormData) {
  const { session, employee } = await employeeContext();
  const customerName = String(formData.get("customerName") ?? "").trim();
  const customerId = String(formData.get("customerId") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const bookingAmount = Number(formData.get("bookingAmount"));
  const advancePaid = Number(formData.get("advancePaid"));
  if (!customerName || !description || !Number.isFinite(bookingAmount) || !Number.isFinite(advancePaid) || bookingAmount <= 0 || advancePaid < 0 || advancePaid > bookingAmount) throw new Error("Enter valid customer, item, booking amount, and advance amount.");
  const bookingNo = createNumber("AB");
  await prisma.advanceBooking.create({ data: {
    bookingNo, customer: customerId ? { connect: { id: customerId } } : undefined, customerName, customerPhone: String(formData.get("customerPhone") ?? "").trim(),
    description, productCode: String(formData.get("productCode") ?? "").trim(), category: String(formData.get("category") ?? "").trim(),
    approximateWeight: Number(formData.get("approximateWeight") || 0), purity: String(formData.get("purity") ?? ""), metal: String(formData.get("metal") ?? "GOLD"),
    bookingAmount, advancePaid, balanceAmount: bookingAmount - advancePaid, paymentMode: String(formData.get("paymentMode") ?? "CASH"),
    expectedDelivery: formData.get("expectedDelivery") ? new Date(String(formData.get("expectedDelivery"))) : null,
    goldRate: Number(formData.get("goldRate") || 0), makingCharges: Number(formData.get("makingCharges") || 0), taxAmount: Number(formData.get("taxAmount") || 0),
    instructions: String(formData.get("instructions") ?? "").trim(), status: advancePaid === bookingAmount ? "FULLY_PAID" : advancePaid > 0 ? "PARTIALLY_PAID" : "CONFIRMED",
    employee: employee ? { connect: { id: employee.id } } : undefined, employeeCode: employee?.employeeCode ?? session.employeeCode ?? "", billerName: employee?.name ?? session.username, billerSignature: employee?.signature ?? "",
    counter: employee?.counter ? { connect: { id: employee.counter.id } } : undefined, counterNumber: employee?.counter?.number ?? "",
    payments: advancePaid > 0 ? { create: { amount: advancePaid, mode: String(formData.get("paymentMode") ?? "CASH") } } : undefined,
  } });
  await prisma.employeeActivity.create({ data: { employeeId: employee?.id, employeeCode: employee?.employeeCode ?? "", employeeName: employee?.name ?? session.username, action: "ADVANCE_BOOKING_CREATED", transactionNo: bookingNo } });
  revalidatePath("/bookings");
}

export async function addBookingPaymentAction(formData: FormData) {
  const { session, employee } = await employeeContext();
  const id = String(formData.get("id") ?? "");
  const amount = Number(formData.get("amount"));
  const mode = String(formData.get("mode") ?? "CASH");
  if (!Number.isFinite(amount) || amount <= 0 || !["CASH", "UPI", "CARD", "CHEQUE", "BANK"].includes(mode)) throw new Error("Enter a valid advance payment and payment mode.");
  await prisma.$transaction(async (tx) => {
    const changed = await tx.advanceBooking.updateMany({ where: { id, balanceAmount: { gte: amount }, status: { notIn: ["CANCELLED", "REFUNDED", "DELIVERED"] } }, data: { advancePaid: { increment: amount }, balanceAmount: { decrement: amount }, status: "PARTIALLY_PAID" } });
    if (!changed.count) throw new Error("The booking is closed or the payment exceeds its balance.");
    const booking = await tx.advanceBooking.findUniqueOrThrow({ where: { id } });
    if (Number(booking.balanceAmount) === 0) await tx.advanceBooking.update({ where: { id }, data: { status: "FULLY_PAID" } });
    await tx.advancePayment.create({ data: { bookingId: id, amount, mode } });
    await tx.employeeActivity.create({ data: { employeeId: employee?.id, employeeCode: employee?.employeeCode ?? session.employeeCode ?? "", employeeName: employee?.name ?? session.username, action: "ADVANCE_PAYMENT", transactionNo: booking.bookingNo, newValue: `${amount} ${mode}` } });
  });
  revalidatePath("/bookings");
}

async function requireBookingAdmin() {
  const session = await getSession();
  if (!session || session.role !== "admin") throw new Error("Administrator access is required to edit or delete advance bookings.");
  return session;
}

export async function updateBookingAction(id: string, formData: FormData) {
  const session = await requireBookingAdmin();
  const booking = await prisma.advanceBooking.findUnique({ where: { id } });
  if (!booking) throw new Error("Advance booking not found.");
  const customerName = String(formData.get("customerName") ?? "").trim();
  const bookingAmount = Number(formData.get("bookingAmount"));
  const approximateWeight = Number(formData.get("approximateWeight") || 0);
  const goldRate = Number(formData.get("goldRate") || 0);
  const makingCharges = Number(formData.get("makingCharges") || 0);
  const taxAmount = Number(formData.get("taxAmount") || 0);
  if (!customerName || !String(formData.get("description") ?? "").trim() || !Number.isFinite(bookingAmount) || bookingAmount < Number(booking.advancePaid) || ![approximateWeight, goldRate, makingCharges, taxAmount].every((value) => Number.isFinite(value) && value >= 0)) {
    throw new Error("Enter valid booking details. The booking amount cannot be less than the advance already collected.");
  }
  const expectedDeliveryValue = String(formData.get("expectedDelivery") ?? "");
  const expectedDelivery = expectedDeliveryValue ? new Date(`${expectedDeliveryValue}T12:00:00`) : null;
  if (expectedDelivery && Number.isNaN(expectedDelivery.getTime())) throw new Error("Enter a valid expected delivery date.");
  const wasClosed = ["CANCELLED", "REFUNDED", "DELIVERED"].includes(booking.status);
  const advancePaid = Number(booking.advancePaid);
  const status = wasClosed ? booking.status : advancePaid >= bookingAmount ? "FULLY_PAID" : advancePaid > 0 ? "PARTIALLY_PAID" : "CONFIRMED";
  const updated = await prisma.advanceBooking.update({ where: { id }, data: {
    customerName, customerPhone: String(formData.get("customerPhone") ?? "").trim(), description: String(formData.get("description") ?? "").trim(),
    productCode: String(formData.get("productCode") ?? "").trim(), category: String(formData.get("category") ?? "").trim(),
    metal: String(formData.get("metal") ?? "GOLD"), purity: String(formData.get("purity") ?? "").trim(), approximateWeight,
    bookingAmount, balanceAmount: Math.max(0, bookingAmount - advancePaid), expectedDelivery, goldRate, makingCharges, taxAmount,
    instructions: String(formData.get("instructions") ?? "").trim(), status,
  } });
  await prisma.employeeActivity.create({ data: { employeeId: session.employeeId ?? null, employeeCode: session.employeeCode ?? "ADMIN", employeeName: session.employeeName ?? session.username, action: "ADVANCE_BOOKING_EDITED", transactionNo: booking.bookingNo, oldValue: `${booking.customerName}: ${booking.bookingAmount}`, newValue: `${updated.customerName}: ${updated.bookingAmount}` } });
  revalidatePath("/bookings");
  revalidatePath(`/bookings/${id}`);
  redirect("/bookings");
}

export async function deleteBookingAction(formData: FormData) {
  const session = await requireBookingAdmin();
  const id = String(formData.get("id") ?? "");
  await prisma.$transaction(async (tx) => {
    const booking = await tx.advanceBooking.findUnique({ where: { id } });
    if (!booking) throw new Error("Advance booking not found.");
    await tx.advancePayment.deleteMany({ where: { bookingId: id } });
    await tx.advanceBooking.delete({ where: { id } });
    await tx.employeeActivity.create({ data: { employeeId: session.employeeId ?? null, employeeCode: session.employeeCode ?? "ADMIN", employeeName: session.employeeName ?? session.username, action: "ADVANCE_BOOKING_DELETED", transactionNo: booking.bookingNo, oldValue: `${booking.customerName}: ${booking.bookingAmount}` } });
  });
  revalidatePath("/bookings");
  redirect("/bookings");
}

export async function createCreditNoteAction(formData: FormData) {
  const { session, employee } = await employeeContext();
  const invoiceId = String(formData.get("invoiceId") ?? "");
  const amount = Number(formData.get("creditAmount"));
  const reason = String(formData.get("reason") ?? "").trim();
  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice || invoice.status !== "FINAL" || !Number.isFinite(amount) || amount <= 0 || amount > Number(invoice.grandTotal) || !reason) throw new Error("Select a finalized invoice and enter a valid credit amount and reason.");
  const issued = await prisma.creditNote.aggregate({ where: { invoiceId, status: { not: "REJECTED" } }, _sum: { creditAmount: true } });
  if (amount + Number(issued._sum.creditAmount ?? 0) > Number(invoice.grandTotal)) throw new Error("Total credit notes cannot exceed the original invoice amount.");
  const creditNoteNo = createNumber("CN");
  const note = await prisma.creditNote.create({ data: {
    creditNoteNo, invoiceId: invoice.id, invoiceNo: invoice.invoiceNo, customerName: invoice.customerName,
    originalBillDate: invoice.date, originalAmount: invoice.grandTotal, creditAmount: amount, remainingBalance: amount, reason,
    employeeId: employee?.id, employeeCode: employee?.employeeCode ?? session.employeeCode ?? "", createdByName: employee?.name ?? session.username,
  } });
  await prisma.employeeActivity.create({ data: { employeeId: employee?.id, employeeCode: employee?.employeeCode ?? "", employeeName: employee?.name ?? session.username, action: "CREDIT_NOTE_CREATED", transactionNo: note.creditNoteNo } });
  revalidatePath("/credit-notes");
}

export async function approveCreditNoteAction(formData: FormData) {
  const { session, employee } = await employeeContext();
  if (session.role !== "admin" && session.role !== "manager") throw new Error("Manager or administrator access is required to approve credit notes.");
  const id = String(formData.get("id") ?? "");
  const note = await prisma.creditNote.findUnique({ where: { id } });
  if (!note || note.status !== "PENDING") throw new Error("This credit note is no longer awaiting approval.");
  await prisma.creditNote.updateMany({ where: { id, status: "PENDING" }, data: {
    status: "APPROVED", approvedById: employee?.id, approvedByCode: employee?.employeeCode ?? "ADMIN", approvedByName: employee?.name ?? session.username, approvedAt: new Date(),
  } });
  await prisma.employeeActivity.create({ data: { employeeId: employee?.id, employeeCode: employee?.employeeCode ?? "ADMIN", employeeName: employee?.name ?? session.username, action: "CREDIT_NOTE_APPROVED", transactionNo: note.creditNoteNo } });
  revalidatePath("/credit-notes");
}

export async function rejectCreditNoteAction(formData: FormData) {
  const { session } = await employeeContext();
  if (session.role !== "admin" && session.role !== "manager") throw new Error("Manager or administrator access is required to reject credit notes.");
  const id = String(formData.get("id") ?? "");
  const note = await prisma.creditNote.findFirst({ where: { id, status: "PENDING" } });
  if (!note) throw new Error("This credit note is no longer awaiting approval.");
  await prisma.creditNote.update({ where: { id }, data: { status: "REJECTED" } });
  await prisma.employeeActivity.create({ data: { employeeId: session.employeeId, employeeCode: session.employeeCode ?? "ADMIN", employeeName: session.employeeName ?? session.username, action: "CREDIT_NOTE_REJECTED", transactionNo: note.creditNoteNo } });
  revalidatePath("/credit-notes");
}

export async function adjustCreditNoteAction(formData: FormData) {
  const { session, employee } = await employeeContext();
  const id = String(formData.get("id") ?? "");
  const invoiceId = String(formData.get("invoiceId") ?? "");
  const amount = Number(formData.get("amount"));
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Enter a positive adjustment amount.");
  const target = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!target || target.status !== "FINAL") throw new Error("Select a finalized invoice for this adjustment.");
  await prisma.$transaction(async (tx) => {
    const invoiceChanged = await tx.invoice.updateMany({ where: { id: invoiceId, status: "FINAL", balanceAmount: { gte: amount } }, data: { paidAmount: { increment: amount }, balanceAmount: { decrement: amount } } });
    if (!invoiceChanged.count) throw new Error("The target invoice balance is lower than the adjustment amount.");
    const changed = await tx.creditNote.updateMany({ where: { id, status: "APPROVED", remainingBalance: { gte: amount } }, data: { remainingBalance: { decrement: amount }, status: "APPROVED" } });
    if (!changed.count) throw new Error("The credit is not approved or its available balance is too low.");
    const note = await tx.creditNote.findUniqueOrThrow({ where: { id } });
    await tx.payment.create({ data: { invoiceId, method: "CREDIT", amount, reference: `Credit note ${note.creditNoteNo}` } });
    await tx.creditNoteAdjustment.create({ data: { creditNoteId: id, invoiceId, invoiceNo: target.invoiceNo, amount, employeeCode: employee?.employeeCode ?? session.employeeCode ?? "" } });
    if (Number(note.remainingBalance) === 0) await tx.creditNote.update({ where: { id }, data: { status: "USED" } });
    await tx.employeeActivity.create({ data: { employeeId: employee?.id, employeeCode: employee?.employeeCode ?? session.employeeCode ?? "", employeeName: employee?.name ?? session.username, action: "CREDIT_NOTE_ADJUSTED", transactionNo: note.creditNoteNo, newValue: `${amount} -> ${target.invoiceNo}` } });
  });
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/credit-notes");
}
