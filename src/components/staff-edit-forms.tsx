"use client";

import { useActionState, useState } from "react";
import { updateCounterAction, updateEmployeeAction, type StaffSaveState } from "@/lib/staff-actions";

const initialState: StaffSaveState = {};
const fieldClass = "mt-1 w-full rounded border border-sand p-1";

function SaveFeedback({ state }: { state: StaffSaveState }) {
  if (state.error) return <p role="alert" className="text-xs text-red-700">{state.error}</p>;
  if (state.saved) return <p role="status" className="text-xs font-medium text-emerald-700">Saved successfully.</p>;
  return null;
}

export function EmployeeEditForm({ employee }: { employee: {
  id: string; name: string; employeeCode: string; username: string; role: string;
  mobile: string; email: string; designation: string; department: string; dateOfJoining: Date;
} }) {
  const [state, action, pending] = useActionState(updateEmployeeAction, initialState);
  const [open, setOpen] = useState(false);

  return <div>
    <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} className="mt-2 text-xs font-semibold text-royal-deep">
      {open ? "Close employee editor" : "Edit employee & role"}
    </button>
    {open && <form action={action} className="mt-2 grid min-w-64 gap-2 rounded bg-cream p-3 text-xs">
      <input type="hidden" name="id" value={employee.id} />
      <label>Name<input required name="name" defaultValue={employee.name} className={fieldClass} /></label>
      <label>Employee code<input required name="employeeCode" defaultValue={employee.employeeCode} className={fieldClass} /></label>
      <label>Username<input required name="username" defaultValue={employee.username} className={fieldClass} /></label>
      <label>Role<select name="role" defaultValue={employee.role} className={fieldClass}><option value="counter">Counter staff</option><option value="manager">Manager</option><option value="admin">Admin</option></select></label>
      <label>Mobile<input name="mobile" defaultValue={employee.mobile} className={fieldClass} /></label>
      <label>Email<input type="email" name="email" defaultValue={employee.email} className={fieldClass} /></label>
      <label>Designation<input name="designation" defaultValue={employee.designation} className={fieldClass} /></label>
      <label>Department<input name="department" defaultValue={employee.department} className={fieldClass} /></label>
      <label>Joining date<input type="date" name="dateOfJoining" defaultValue={employee.dateOfJoining.toISOString().slice(0, 10)} className={fieldClass} /></label>
      <SaveFeedback state={state} />
      <button disabled={pending} className="rounded bg-royal-deep px-3 py-2 font-semibold text-white disabled:opacity-60">{pending ? "Saving…" : "Save employee"}</button>
    </form>}
    {!open && state.saved && <SaveFeedback state={state} />}
    {!open && state.error && <SaveFeedback state={state} />}
  </div>;
}

export function CounterEditForm({ counter }: { counter: { id: string; number: string; name: string; location: string } }) {
  const [state, action, pending] = useActionState(updateCounterAction, initialState);
  const [open, setOpen] = useState(false);

  return <div>
    <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} className="mt-2 cursor-pointer text-xs font-semibold text-royal-deep">
      {open ? "Close counter editor" : "Edit counter"}
    </button>
    {open && <form action={action} className="mt-2 grid gap-2">
      <input type="hidden" name="counterId" value={counter.id} />
      <input required name="number" aria-label="Counter number" defaultValue={counter.number} className={fieldClass} />
      <input required name="name" aria-label="Counter name" defaultValue={counter.name} className={fieldClass} />
      <input name="location" aria-label="Counter location" defaultValue={counter.location} placeholder="Location" className={fieldClass} />
      <SaveFeedback state={state} />
      <button disabled={pending} className="text-left text-xs font-semibold disabled:opacity-60">{pending ? "Saving…" : "Save counter"}</button>
    </form>}
    {!open && state.saved && <SaveFeedback state={state} />}
    {!open && state.error && <SaveFeedback state={state} />}
  </div>;
}
