"use client";

export interface PrintAgentJob {
  printerName: string;
  copies: number;
  agentUrl: string;
  agentToken: string;
  tsplData: string;
}

export interface PrintAgentStatus {
  status?: string;
  printers?: Array<{ name: string; status: string; isDefault: boolean }>;
}

function agentEndpoint(agentUrl: string, path: string) {
  return `${agentUrl.trim().replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

export async function checkPrintAgent(agentUrl: string): Promise<PrintAgentStatus> {
  const response = await fetch(agentEndpoint(agentUrl, "/status"), {
    method: "GET",
    mode: "cors",
    credentials: "omit",
    cache: "no-store",
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error(`Print Agent returned HTTP ${response.status}.`);
  const status = await response.json();
  if (status.status !== "ONLINE") throw new Error("Print Agent did not report ONLINE status.");
  return status;
}

export async function sendToPrintAgent(job: PrintAgentJob) {
  try {
    const response = await fetch(agentEndpoint(job.agentUrl, "/print/tspl"), {
      method: "POST",
      mode: "cors",
      credentials: "omit",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${job.agentToken}`,
      },
      body: JSON.stringify({
        printerName: job.printerName,
        tsplData: job.tsplData,
        copies: job.copies,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.ok !== true) {
      return {
        ok: false as const,
        error: result.error || `Print Agent returned HTTP ${response.status}.`,
      };
    }
    return { ok: true as const };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return {
      ok: false as const,
      error: `The Print Agent at ${job.agentUrl} could not be reached. Start it on the PC connected to the printer, allow this website's local network/loopback access in the browser, and confirm the website origin is allowed by the agent. (${detail})`,
    };
  }
}
