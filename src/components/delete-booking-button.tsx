"use client";

import { deleteBookingAction } from "@/lib/booking-credit-actions";

export function DeleteBookingButton({ id, bookingNo }: { id: string; bookingNo: string }) {
  return <form action={deleteBookingAction} onSubmit={(event) => {
    if (!window.confirm(`Delete booking ${bookingNo}? Its payment history will also be removed.`)) event.preventDefault();
  }}>
    <input type="hidden" name="id" value={id} />
    <button className="text-xs font-semibold text-red-700">Delete</button>
  </form>;
}
