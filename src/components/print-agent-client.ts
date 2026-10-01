"use client";

export interface PrintAgentJob {
  printerName: string;
  copies: number;
  agentUrl: string;
  agentToken: string;
  tsplData: string;
}

export async function sendToPrintAgent(job: PrintAgentJob) {
  try {
    const response = await fetch(`${job.agentUrl.replace(/\/$/, "")}/print/tspl`, {
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
      error: `The Print Agent at ${job.agentUrl} could not be reached from this browser. Start the agent on the PC connected to the printer, allow this site to access the local network if prompted, and check the agent URL. (${detail})`,
    };
  }
}
