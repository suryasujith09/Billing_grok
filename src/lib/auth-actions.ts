"use server";

import { redirect } from "next/navigation";
import { createSession, deleteSession } from "./session";
import type { Role } from "./session";
import { prisma } from "./db";
import { scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { headers } from "next/headers";

const scrypt = promisify(scryptCallback);

async function verifyPassword(password: string, stored: string) {
  const [salt, expectedHex] = stored.split(":");
  if (!salt || !expectedHex) return false;
  const expected = Buffer.from(expectedHex, "hex");
  const actual = (await scrypt(password, salt, expected.length)) as Buffer;
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export type AuthState = { error: string } | null;

export async function loginAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const adminUser = (process.env.ADMIN_USERNAME ?? "admin").toLowerCase();
  const adminPass = process.env.ADMIN_PASSWORD ?? "admin123";

  let role: Role | null = null;
  let displayName = "";
  let identity: { employeeId: string; employeeCode: string; employeeName: string; loginSessionId: string } | undefined;

  if (username === adminUser && password === adminPass) {
    role = "admin";
    displayName = "Admin";
  }

  if (!role) {
    const employee = await prisma.employee.findUnique({ where: { username } });
    if (employee && employee.status === "ACTIVE" && await verifyPassword(password, employee.passwordHash)) {
      role = employee.role as Role;
      displayName = employee.name;
      const requestHeaders = await headers();
      const loginSession = await prisma.loginSession.create({ data: {
        employeeId: employee.id,
        employeeCode: employee.employeeCode,
        employeeName: employee.name,
        ipAddress: requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "",
        userAgent: requestHeaders.get("user-agent") ?? "",
      } });
      await prisma.employeeActivity.create({ data: {
        employeeId: employee.id, employeeCode: employee.employeeCode,
        employeeName: employee.name, action: "LOGIN",
      } });
      identity = { employeeId: employee.id, employeeCode: employee.employeeCode, employeeName: employee.name, loginSessionId: loginSession.id };
    }
  }

  if (!role) {
    return { error: "Invalid username or passcode. Please try again." };
  }

  await createSession(role, displayName, identity);
  redirect("/");
}

export async function logoutAction(): Promise<never> {
  const { getSession } = await import("./session");
  const session = await getSession();
  if (session?.loginSessionId && session.employeeId) {
    const endedAt = new Date();
    await prisma.loginSession.updateMany({ where: { id: session.loginSessionId, employeeId: session.employeeId, endedAt: null }, data: { endedAt } });
    await prisma.employeeActivity.create({ data: {
      employeeId: session.employeeId, employeeCode: session.employeeCode ?? "",
      employeeName: session.employeeName ?? session.username, action: "LOGOUT",
    } });
  }
  await deleteSession();
  redirect("/login");
}
