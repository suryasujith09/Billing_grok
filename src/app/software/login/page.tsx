import { redirect } from "next/navigation";

// Keep one authentication flow: this public entry point forwards staff to the
// existing login page and its existing session, role and permission checks.
export default function SoftwareLoginPage() {
  redirect("/login");
}
