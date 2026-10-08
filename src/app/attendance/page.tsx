import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { PageHeader } from "@/components/ui";
import { checkInAction, checkOutAction } from "@/lib/staff-actions";
import { connection } from "next/server";
import { indiaDayBounds } from "@/lib/india-time";

function time(value: Date | null) {
  return value ? value.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—";
}

export default async function AttendancePage() {
  await connection();
  const session = await getSession();
  const { start: today, end: tomorrow } = indiaDayBounds();
  const isAdmin = session?.role === "admin";
  const [employees, todayRows, myRow] = await Promise.all([
    isAdmin ? prisma.employee.findMany({ where: { status: "ACTIVE" }, orderBy: { name: "asc" } }) : Promise.resolve([]),
    isAdmin ? prisma.attendance.findMany({ where: { date: { gte: today, lt: tomorrow } }, orderBy: { employeeName: "asc" } }) : Promise.resolve([]),
    session?.employeeId ? prisma.attendance.findUnique({ where: { employeeId_date: { employeeId: session.employeeId, date: today } } }) : Promise.resolve(null),
  ]);
  const present = todayRows.filter((row) => row.checkIn).length;
  const checkedOut = todayRows.filter((row) => row.checkOut).length;
  return <div className="space-y-6">
    <PageHeader eyebrow="Staff" title="Attendance" subtitle="Record your shift and review daily employee attendance." />
    {session?.employeeId && <section className="rounded-xl border border-sand bg-white p-5">
      <h2 className="font-semibold">Your shift today</h2>
      <p className="mt-1 text-sm text-stone">{session.employeeName} · {session.employeeCode}</p>
      <p className="mt-2 text-sm">Check-in: {time(myRow?.checkIn ?? null)} <span className="mx-2 text-stone">·</span> Check-out: {time(myRow?.checkOut ?? null)}</p>
      {myRow?.checkIn && myRow.checkOut && <p className="text-sm text-stone">Working time: {Math.floor(myRow.totalMinutes / 60)}h {myRow.totalMinutes % 60}m</p>}
      <div className="mt-4 flex gap-2">{!myRow?.checkIn && <form action={checkInAction}><button className="rounded bg-royal-deep px-4 py-2 text-sm font-semibold text-white">Check in</button></form>}{myRow?.checkIn && !myRow.checkOut && <form action={checkOutAction}><button className="rounded bg-royal-deep px-4 py-2 text-sm font-semibold text-white">Check out</button></form>}{myRow?.checkOut && <span className="rounded bg-emerald-50 px-3 py-2 text-sm text-emerald-800">Shift complete</span>}</div>
    </section>}
    {isAdmin && <>
      <div className="grid gap-3 sm:grid-cols-4">{[["Active employees", employees.length], ["Present", present], ["Absent", Math.max(0, employees.length - present)], ["Checked out", checkedOut]].map(([label, value]) => <div key={label} className="rounded-xl border border-sand bg-white p-4"><p className="text-xs text-stone">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p></div>)}</div>
      <section className="rounded-xl border border-sand bg-white p-5"><h2 className="mb-3 font-semibold">Today&apos;s attendance</h2><div className="overflow-x-auto"><table className="w-full min-w-[600px] text-left text-sm"><thead><tr className="border-b text-stone"><th className="p-2">Employee</th><th className="p-2">Code</th><th className="p-2">Check-in</th><th className="p-2">Check-out</th><th className="p-2">Hours</th><th className="p-2">Status</th></tr></thead><tbody>{employees.map((employee) => { const row = todayRows.find((entry) => entry.employeeId === employee.id); return <tr key={employee.id} className="border-b border-sand/70"><td className="p-2">{employee.name}</td><td className="p-2 font-mono">{employee.employeeCode}</td><td className="p-2">{time(row?.checkIn ?? null)}</td><td className="p-2">{time(row?.checkOut ?? null)}</td><td className="p-2">{row?.checkOut ? `${Math.floor(row.totalMinutes / 60)}h ${row.totalMinutes % 60}m` : "—"}</td><td className="p-2">{row?.status ?? "NOT CHECKED IN"}</td></tr>; })}</tbody></table></div></section>
    </>}
  </div>;
}
