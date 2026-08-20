"use server";

import { redirect } from "next/navigation";
import { createSession, deleteSession } from "./session";
import type { Role } from "./session";

export type AuthState = { error: string } | null;

export async function loginAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const adminUser = (process.env.ADMIN_USERNAME ?? "admin").toLowerCase();
  const adminPass = process.env.ADMIN_PASSWORD ?? "admin123";
  const counterUser = (process.env.COUNTER_USERNAME ?? "counter").toLowerCase();
  const counterPass = process.env.COUNTER_PASSWORD ?? "counter123";

  let role: Role | null = null;
  let displayName = "";

  if (username === adminUser && password === adminPass) {
    role = "admin";
    displayName = "Admin";
  } else if (username === counterUser && password === counterPass) {
    role = "counter";
    displayName = "Counter";
  }

  if (!role) {
    return { error: "Invalid username or passcode. Please try again." };
  }

  await createSession(role, displayName);
  redirect("/");
}

export async function logoutAction(): Promise<never> {
  await deleteSession();
  redirect("/login");
}
