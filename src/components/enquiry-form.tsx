"use client";

import { useState, type FormEvent } from "react";

type Result = { kind: "success" | "error"; message: string } | null;

export function EnquiryForm() {
  const [result, setResult] = useState<Result>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setResult(null);
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      const response = await fetch("/api/enquiries", { method: "POST", body: data });
      const payload = await response.json() as { message?: string };
      if (!response.ok) throw new Error(payload.message ?? "We could not send your enquiry. Please try again.");
      form.reset();
      setResult({ kind: "success", message: payload.message ?? "Thank you. Your enquiry has been sent." });
    } catch (error) {
      setResult({ kind: "error", message: error instanceof Error ? error.message : "We could not send your enquiry. Please try again." });
    } finally {
      setPending(false);
    }
  }

  return <form className="site-enquiry-form" onSubmit={submit}>
    <div className="site-form-row"><label>Your name<input name="name" autoComplete="name" maxLength={100} required placeholder="Name" /></label><label>Email address<input name="email" type="email" autoComplete="email" maxLength={254} required placeholder="you@example.com" /></label></div>
    <label>What would you like to know?<textarea name="message" rows={5} maxLength={3000} required placeholder="Tell us a little about what you are looking for…" /></label>
    <label className="site-honeypot" aria-hidden="true">Leave this field empty<input name="company" tabIndex={-1} autoComplete="off" /></label>
    <button className="site-button site-button-dark" type="submit" disabled={pending}>{pending ? "Sending…" : "Send enquiry"}<span aria-hidden="true">↗</span></button>
    <p className="site-form-privacy">Your details are used only to respond to your enquiry.</p>
    {result && <p className={`site-form-result ${result.kind}`} role="status">{result.message}</p>}
  </form>;
}
