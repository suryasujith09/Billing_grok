import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { connection } from "next/server";
import { assignCounterAction, createCounterAction, createEmployeeAction, removeEmployeeSignatureAction, resetEmployeePasswordAction, saveEmployeeSignatureAction, setEmployeeStatusAction } from "@/lib/staff-actions";

export default async function EmployeesPage() {
  await connection();
  const [employees, counters, activities] = await Promise.all([
    prisma.employee.findMany({ include: { counter: true }, orderBy: [{ status: "asc" }, { name: "asc" }] }),
    prisma.counter.findMany({ include: { employee: true }, orderBy: { number: "asc" } }),
    prisma.employeeActivity.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
  ]);
  return <div className="space-y-6">
    <PageHeader eyebrow="Admin · Staff" title="Employees & Counters" subtitle="Manage employee access, showroom counters, and invoice signatures." />
    <section className="grid gap-6 xl:grid-cols-2">
      <form action={createEmployeeAction} className="rounded-xl border border-sand bg-white p-5 space-y-3">
        <h2 className="font-semibold">Add employee</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">Employee name<input required name="name" className="mt-1 w-full rounded border border-sand p-2" /></label>
          <label className="text-sm">Employee code<input required name="employeeCode" placeholder="EMP001" className="mt-1 w-full rounded border border-sand p-2" /></label>
          <label className="text-sm">Username<input required name="username" className="mt-1 w-full rounded border border-sand p-2" /></label>
          <label className="text-sm">Initial password<input required minLength={10} name="password" type="password" className="mt-1 w-full rounded border border-sand p-2" /></label>
          <label className="text-sm">Mobile<input name="mobile" className="mt-1 w-full rounded border border-sand p-2" /></label>
          <label className="text-sm">Email<input name="email" type="email" className="mt-1 w-full rounded border border-sand p-2" /></label>
          <label className="text-sm">Designation<input name="designation" className="mt-1 w-full rounded border border-sand p-2" /></label>
          <label className="text-sm">Department<input name="department" className="mt-1 w-full rounded border border-sand p-2" /></label>
          <label className="text-sm">Date of joining<input name="dateOfJoining" type="date" className="mt-1 w-full rounded border border-sand p-2" /></label>
          <label className="text-sm">Role<select name="role" className="mt-1 w-full rounded border border-sand p-2"><option value="counter">Counter staff</option><option value="manager">Manager</option><option value="admin">Admin</option></select></label>
        </div>
        <button className="rounded bg-royal-deep px-4 py-2 text-sm font-semibold text-white">Create employee</button>
      </form>
      <form action={createCounterAction} className="rounded-xl border border-sand bg-white p-5 space-y-3">
        <h2 className="font-semibold">Add counter</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">Counter number<input required name="number" placeholder="C-03" className="mt-1 w-full rounded border border-sand p-2" /></label>
          <label className="text-sm">Counter name<input required name="name" className="mt-1 w-full rounded border border-sand p-2" /></label>
          <label className="text-sm">Location / section<input name="location" className="mt-1 w-full rounded border border-sand p-2" /></label>
          <label className="text-sm">Assigned employee<select name="employeeId" className="mt-1 w-full rounded border border-sand p-2"><option value="">Unassigned</option>{employees.filter((e) => e.status === "ACTIVE" && !e.counter).map((e) => <option key={e.id} value={e.id}>{e.name} · {e.employeeCode}</option>)}</select></label>
        </div>
        <button className="rounded bg-royal-deep px-4 py-2 text-sm font-semibold text-white">Create counter</button>
      </form>
    </section>

    <section className="rounded-xl border border-sand bg-white p-5">
      <h2 className="mb-4 font-semibold">Employee directory</h2>
      <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead><tr className="border-b text-stone"><th className="p-2">Employee</th><th className="p-2">Code</th><th className="p-2">Login / role</th><th className="p-2">Counter</th><th className="p-2">Signature</th><th className="p-2">Status</th></tr></thead><tbody>
        {employees.map((employee) => <tr key={employee.id} className="border-b border-sand/70 align-top"><td className="p-2"><strong>{employee.name}</strong><div className="text-xs text-stone">{employee.designation} {employee.department && `· ${employee.department}`}</div></td><td className="p-2 font-mono">{employee.employeeCode}</td><td className="p-2">{employee.username}<div className="text-xs capitalize text-stone">{employee.role}</div><form action={resetEmployeePasswordAction} className="mt-1"><input type="hidden" name="id" value={employee.id} /><input required minLength={10} name="password" type="password" placeholder="New password" className="w-32 rounded border border-sand p-1 text-xs" /><button className="ml-1 text-xs font-semibold">Reset</button></form></td><td className="p-2">{employee.counter ? `${employee.counter.number} · ${employee.counter.name}` : "—"}</td><td className="p-2"><div className="flex items-start gap-2">{employee.signature && <img src={employee.signature} alt={`${employee.name} signature`} className="h-10 max-w-24 object-contain" />}<div><form action={saveEmployeeSignatureAction}><input type="hidden" name="id" value={employee.id} /><input aria-label={`Signature for ${employee.name}`} name="signature" type="file" accept="image/png,image/jpeg,image/webp" required className="max-w-36 text-xs" /><button className="block text-xs font-semibold text-royal-deep">Upload / replace</button></form>{employee.signature && <form action={removeEmployeeSignatureAction}><input type="hidden" name="id" value={employee.id} /><button className="text-xs text-red-700">Remove</button></form>}</div></div></td><td className="p-2"><form action={setEmployeeStatusAction} className="flex gap-1"><input type="hidden" name="id" value={employee.id} /><select name="status" defaultValue={employee.status} className="rounded border border-sand p-1 text-xs"><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option><option value="RESIGNED">Resigned</option><option value="TERMINATED">Terminated</option></select><button className="text-xs font-semibold">Save</button></form></td></tr>)}
      </tbody></table></div>
    </section>
    <section className="rounded-xl border border-sand bg-white p-5"><h2 className="mb-3 font-semibold">Counters</h2><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{counters.map((counter) => <div key={counter.id} className="rounded-lg border border-sand p-3 text-sm"><strong>{counter.number} · {counter.name}</strong><div className="text-xs text-stone">{counter.location} · {counter.status}</div><form action={assignCounterAction} className="mt-2 flex gap-1"><input type="hidden" name="counterId" value={counter.id} /><select name="employeeId" defaultValue={counter.employeeId ?? ""} className="min-w-0 flex-1 rounded border border-sand p-1 text-xs"><option value="">Unassigned</option>{employees.filter((e) => e.status === "ACTIVE" && (!e.counter || e.counter.id === counter.id)).map((e) => <option key={e.id} value={e.id}>{e.name} · {e.employeeCode}</option>)}</select><button className="text-xs font-semibold">Assign</button></form></div>)}</div></section>
    <section className="rounded-xl border border-sand bg-white p-5"><h2 className="mb-3 font-semibold">Recent employee activity</h2><div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead><tr className="border-b text-stone"><th className="p-2">Date / time</th><th className="p-2">Employee</th><th className="p-2">Action</th><th className="p-2">Transaction</th><th className="p-2">Details</th></tr></thead><tbody>{activities.map((entry) => <tr key={entry.id} className="border-b border-sand/70"><td className="p-2 text-xs">{entry.createdAt.toLocaleString("en-IN")}</td><td className="p-2">{entry.employeeName}<div className="text-xs text-stone">{entry.employeeCode}</div></td><td className="p-2">{entry.action.replaceAll("_", " ")}</td><td className="p-2 font-mono text-xs">{entry.transactionNo || "—"}</td><td className="p-2 text-xs">{entry.newValue || entry.oldValue || "—"}</td></tr>)}</tbody></table></div></section>
  </div>;
}
