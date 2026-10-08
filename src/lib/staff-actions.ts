"use server";

import { randomBytes, scrypt as scryptCallback } from "node:crypto";
import { promisify } from "node:util";
import { revalidatePath } from "next/cache";
import { prisma } from "./db";
import { getSession } from "./session";
import { indiaDayBounds } from "./india-time";

const scrypt = promisify(scryptCallback);

async function requireAdmin() {
  const session = await getSession();
  if (session?.role !== "admin") throw new Error("Administrator access is required.");
  return session;
}

export async function createEmployeeAction(formData: FormData) {
  await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const employeeCode = String(formData.get("employeeCode") ?? "").trim().toUpperCase();
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!name || !/^[A-Z0-9-]{2,24}$/.test(employeeCode) || !/^[a-z0-9._-]{3,40}$/.test(username) || password.length < 10) {
    throw new Error("Enter a name, valid unique employee code and username, and a password of at least 10 characters.");
  }
  const salt = randomBytes(16).toString("hex");
  const hash = (await scrypt(password, salt, 64)) as Buffer;
  const employee = await prisma.employee.create({ data: {
    name, employeeCode, username, passwordHash: `${salt}:${hash.toString("hex")}`,
    mobile: String(formData.get("mobile") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
    designation: String(formData.get("designation") ?? "").trim(),
    department: String(formData.get("department") ?? "").trim(),
    role: ["admin", "manager", "counter"].includes(String(formData.get("role"))) ? String(formData.get("role")) : "counter",
    dateOfJoining: formData.get("dateOfJoining") ? new Date(String(formData.get("dateOfJoining"))) : new Date(),
  } });
  await prisma.employeeActivity.create({ data: { employeeId: employee.id, employeeCode, employeeName: name, action: "EMPLOYEE_CREATED" } });
  revalidatePath("/employees");
}

export async function createCounterAction(formData: FormData) {
  await requireAdmin();
  const number = String(formData.get("number") ?? "").trim().toUpperCase();
  const name = String(formData.get("name") ?? "").trim();
  const employeeId = String(formData.get("employeeId") ?? "").trim() || null;
  if (!number || !name) throw new Error("Counter number and name are required.");
  await prisma.$transaction(async (tx) => {
    if (employeeId) await tx.counter.updateMany({ where: { employeeId }, data: { employeeId: null } });
    await tx.counter.create({ data: { number, name, location: String(formData.get("location") ?? "").trim(), employeeId } });
  });
  revalidatePath("/employees");
}

export async function assignCounterAction(formData: FormData) {
  await requireAdmin();
  const counterId = String(formData.get("counterId") ?? "");
  const employeeId = String(formData.get("employeeId") ?? "") || null;
  await prisma.$transaction(async (tx) => {
    if (employeeId) await tx.counter.updateMany({ where: { employeeId, id: { not: counterId } }, data: { employeeId: null } });
    await tx.counter.update({ where: { id: counterId }, data: { employeeId } });
  });
  revalidatePath("/employees");
}

export async function setEmployeeStatusAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!["ACTIVE", "INACTIVE", "RESIGNED", "TERMINATED"].includes(status)) throw new Error("Invalid employee status.");
  const employee = await prisma.employee.update({ where: { id }, data: { status } });
  await prisma.employeeActivity.create({ data: { employeeId: id, employeeCode: employee.employeeCode, employeeName: employee.name, action: "EMPLOYEE_STATUS_CHANGED", newValue: status } });
  revalidatePath("/employees");
}

export async function saveEmployeeSignatureAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const file = formData.get("signature");
  if (!(file instanceof File) || file.size > 500_000 || !["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
    throw new Error("Upload a PNG, JPG, or WebP signature image smaller than 500 KB.");
  }
  const dataUrl = `data:${file.type};base64,${Buffer.from(await file.arrayBuffer()).toString("base64")}`;
  await prisma.employee.update({ where: { id }, data: { signature: dataUrl } });
  revalidatePath("/employees");
}

export async function removeEmployeeSignatureAction(formData: FormData) {
  await requireAdmin();
  await prisma.employee.update({ where: { id: String(formData.get("id") ?? "") }, data: { signature: "" } });
  revalidatePath("/employees");
}

export async function resetEmployeePasswordAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const password = String(formData.get("password") ?? "");
  if (password.length < 10) throw new Error("Password must be at least 10 characters.");
  const salt = randomBytes(16).toString("hex");
  const hash = (await scrypt(password, salt, 64)) as Buffer;
  const employee = await prisma.employee.update({ where: { id }, data: { passwordHash: `${salt}:${hash.toString("hex")}` } });
  await prisma.employeeActivity.create({ data: { employeeId: id, employeeCode: employee.employeeCode, employeeName: employee.name, action: "PASSWORD_RESET" } });
  revalidatePath("/employees");
}

export async function checkInAction() {
  const session = await getSession();
  if (!session?.employeeId) throw new Error("An employee login is required for attendance.");
  const employee = await prisma.employee.findUnique({ where: { id: session.employeeId } });
  if (!employee || employee.status !== "ACTIVE") throw new Error("This employee account is inactive.");
  const now = new Date();
  const { start: date } = indiaDayBounds(now);
  const existing = await prisma.attendance.findUnique({ where: { employeeId_date: { employeeId: employee.id, date } } });
  if (existing?.checkIn) throw new Error("You have already checked in today.");
  await prisma.attendance.upsert({
    where: { employeeId_date: { employeeId: employee.id, date } },
    create: { employeeId: employee.id, employeeCode: employee.employeeCode, employeeName: employee.name, date, checkIn: now, status: "PRESENT" },
    update: { checkIn: now, status: "PRESENT" },
  });
  await prisma.employeeActivity.create({ data: { employeeId: employee.id, employeeCode: employee.employeeCode, employeeName: employee.name, action: "ATTENDANCE_CHECK_IN" } });
  revalidatePath("/attendance");
}

export async function checkOutAction() {
  const session = await getSession();
  if (!session?.employeeId) throw new Error("An employee login is required for attendance.");
  const now = new Date();
  const { start: date } = indiaDayBounds(now);
  const row = await prisma.attendance.findUnique({ where: { employeeId_date: { employeeId: session.employeeId, date } } });
  if (!row?.checkIn || row.checkOut) throw new Error("Check in before checking out. A checkout can only be recorded once.");
  const totalMinutes = Math.max(0, Math.floor((now.getTime() - row.checkIn.getTime()) / 60000));
  await prisma.attendance.update({ where: { id: row.id }, data: { checkOut: now, totalMinutes } });
  await prisma.employeeActivity.create({ data: { employeeId: session.employeeId, employeeCode: row.employeeCode, employeeName: row.employeeName, action: "ATTENDANCE_CHECK_OUT" } });
  revalidatePath("/attendance");
}
