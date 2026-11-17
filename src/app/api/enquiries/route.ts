import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const enquirySchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.email().max(254),
  message: z.string().trim().min(8).max(3000),
});

// A small in-process brake for repeated submissions. Configure provider-side
// rate limits too when deploying to a multi-instance environment.
const recentSubmissions = new Map<string, number[]>();

export async function POST(request: NextRequest) {
  const apiKey = process.env.RESEND_API_KEY;
  const recipient = process.env.CONTACT_TO_EMAIL;
  const sender = process.env.CONTACT_FROM_EMAIL;
  if (!apiKey || !recipient || !sender) {
    return NextResponse.json({ message: "Our enquiry form is being set up. Please check back shortly." }, { status: 503 });
  }

  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json({ message: "This enquiry could not be submitted." }, { status: 403 });
  }
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 16_384) return NextResponse.json({ message: "Your message is too large. Please shorten it and try again." }, { status: 413 });

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const now = Date.now();
  const windowStart = now - 60 * 60 * 1000;
  const attempts = (recentSubmissions.get(ip) ?? []).filter((stamp) => stamp > windowStart);
  if (attempts.length >= 5) return NextResponse.json({ message: "Please wait a little before sending another enquiry." }, { status: 429 });

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ message: "Please check your details, then try again." }, { status: 400 });
  }
  if (String(formData.get("company") ?? "").length > 0) {
    return NextResponse.json({ message: "Thank you. Your enquiry has been received." });
  }
  const parsed = enquirySchema.safeParse({
    name: formData.get("name"), email: formData.get("email"),
    message: formData.get("message"),
  });
  if (!parsed.success) return NextResponse.json({ message: "Please check your name, email and message, then try again." }, { status: 400 });

  attempts.push(now);
  recentSubmissions.set(ip, attempts);
  const { name, email, message } = parsed.data;
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: sender, to: [recipient], reply_to: email, subject: `Website enquiry from ${name}`, text: `Name: ${name}\nEmail: ${email}\n\n${message}` }),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error("Mail delivery failed");
    return NextResponse.json({ message: "Thank you. Your enquiry has been sent." });
  } catch {
    return NextResponse.json({ message: "We could not send your enquiry just now. Please try again later." }, { status: 502 });
  }
}
