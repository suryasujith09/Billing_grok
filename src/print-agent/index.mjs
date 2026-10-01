import http from "node:http";
import { exec } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const PORT = process.env.PRINT_AGENT_PORT || 9191;
const TOKEN = process.env.PRINT_AGENT_TOKEN || "surya-print-secret-token";

console.log("=================================================");
console.log(" Surya Jewellery ERP — Local Windows Print Agent ");
console.log(" Target Printer: TVS Electronics LP 46 Dlite (TSPL-EZ)");
console.log(` Listening on: http://127.0.0.1:${PORT}`);
console.log("=================================================");

function getInstalledPrinters() {
  return new Promise((resolve) => {
    if (os.platform() !== "win32") {
      return resolve([
        { name: "TVS LP 46 Dlite (Simulation)", status: "Ready", isDefault: true }
      ]);
    }

    const psScript = `Get-Printer | Select-Object Name, PrinterStatus, IsDefault | ConvertTo-Json`;
    const encodedScript = Buffer.from(psScript, "utf16le").toString("base64");
    const psCommand = `powershell -NoProfile -ExecutionPolicy Bypass -EncodedCommand ${encodedScript}`;

    exec(psCommand, { timeout: 5000 }, (err, stdout) => {
      if (err || !stdout) {
        return resolve([
          { name: "TVS LP 46 Dlite", status: "Unknown", isDefault: true }
        ]);
      }
      try {
        const parsed = JSON.parse(stdout);
        const list = Array.isArray(parsed) ? parsed : [parsed];
        const printers = list.map((p) => ({
          name: p.Name,
          status: p.PrinterStatus === 1 || p.PrinterStatus === 3 ? "Ready" : String(p.PrinterStatus),
          isDefault: Boolean(p.IsDefault),
        }));
        resolve(printers);
      } catch {
        resolve([{ name: "TVS LP 46 Dlite", status: "Ready", isDefault: true }]);
      }
    });
  });
}

function sendRawToWindowsPrinter(printerName, rawData) {
  return new Promise((resolve, reject) => {
    const tempDir = os.tmpdir();
    const tempFile = path.join(
      tempDir,
      `surya_print_${Date.now()}_${Math.random().toString(36).substring(7)}.txt`
    );

    try {
      fs.writeFileSync(tempFile, rawData, "ascii");
    } catch (e) {
      return reject(new Error(`Failed to write temp print file: ${e.message}`));
    }

    if (os.platform() !== "win32") {
      console.log(`[SIMULATION PRINT to ${printerName}]:\n${rawData}`);
      try { fs.unlinkSync(tempFile); } catch {}
      return resolve({ success: true, simulated: true });
    }

    const safePrinter = printerName.replace(/'/g, "''");
    const safeFile = tempFile.replace(/'/g, "''");

    const psScript = `
$printerName = '${safePrinter}'
$filePath = '${safeFile}'

Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class RawPrinterHelper {
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
  public class DocInfo {
    [MarshalAs(UnmanagedType.LPWStr)] public string pDocName;
    [MarshalAs(UnmanagedType.LPWStr)] public string pOutputFile;
    [MarshalAs(UnmanagedType.LPWStr)] public string pDataType;
  }
  [DllImport("winspool.drv", EntryPoint = "OpenPrinterW", SetLastError = true, CharSet = CharSet.Unicode)]
  static extern bool OpenPrinter(string name, out IntPtr printer, IntPtr defaults);
  [DllImport("winspool.drv", SetLastError = true)] static extern bool ClosePrinter(IntPtr printer);
  [DllImport("winspool.drv", EntryPoint = "StartDocPrinterW", SetLastError = true, CharSet = CharSet.Unicode)]
  static extern int StartDocPrinter(IntPtr printer, int level, [In] DocInfo info);
  [DllImport("winspool.drv", SetLastError = true)] static extern bool EndDocPrinter(IntPtr printer);
  [DllImport("winspool.drv", SetLastError = true)] static extern bool StartPagePrinter(IntPtr printer);
  [DllImport("winspool.drv", SetLastError = true)] static extern bool EndPagePrinter(IntPtr printer);
  [DllImport("winspool.drv", SetLastError = true)] static extern bool WritePrinter(IntPtr printer, byte[] data, int count, out int written);
  public static void Send(string name, byte[] data) {
    IntPtr printer;
    if (!OpenPrinter(name, out printer, IntPtr.Zero)) throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error());
    try {
      var info = new DocInfo { pDocName = "Surya Jewellery Tag", pDataType = "RAW" };
      if (StartDocPrinter(printer, 1, info) == 0) throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error());
      try {
        if (!StartPagePrinter(printer)) throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error());
        try {
          int written;
          if (!WritePrinter(printer, data, data.Length, out written) || written != data.Length)
            throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error());
        } finally { EndPagePrinter(printer); }
      } finally { EndDocPrinter(printer); }
    } finally { ClosePrinter(printer); }
  }
}
'@

$printer = Get-Printer | Where-Object { $_.Name -eq $printerName } | Select-Object -First 1
if (-not $printer) { throw "Printer not found: $printerName" }
$bytes = [System.IO.File]::ReadAllBytes($filePath)
[RawPrinterHelper]::Send($printer.Name, $bytes)
Write-Output "SUCCESS: Sent raw TSPL data to $($printer.Name)"
`.trim();

    const encodedScript = Buffer.from(psScript, "utf16le").toString("base64");
    const psCommand = `powershell -NoProfile -ExecutionPolicy Bypass -EncodedCommand ${encodedScript}`;

    exec(psCommand, { timeout: 10000 }, (err, stdout, stderr) => {
      try { fs.unlinkSync(tempFile); } catch {}

      if (err) {
        console.error(`[PRINT AGENT ERROR]:`, stderr || err.message);
        return reject(new Error(stderr || err.message || "Failed to execute PowerShell spooler command"));
      }
      console.log(`[PRINT AGENT JOB SENT]: ${printerName} -> ${stdout.trim()}`);
      resolve({ success: true, message: stdout.trim() });
    });
  });
}

const server = http.createServer(async (req, res) => {
  // CORS Headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }

  const rawUrl = req.url?.split("?")[0] || "/";
  const cleanPath = rawUrl.replace(/\/+$/, "").toLowerCase() || "/";

  const authHeader = req.headers["authorization"] || "";
  const tokenProvided = authHeader.replace(/^Bearer\s+/i, "").trim();

  // 1. Status / Health Check Endpoints
  if ((cleanPath === "/status" || cleanPath === "/health" || cleanPath === "/") && req.method === "GET") {
    const printers = await getInstalledPrinters();
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(
      JSON.stringify({
        status: "ONLINE",
        agent: "Surya Windows Print Agent v1.3",
        platform: os.platform(),
        printersCount: printers.length,
        printers,
        timestamp: new Date().toISOString(),
      })
    );
  }

  // Token / Localhost Security Verification
  const isAuthorized = tokenProvided === TOKEN;

  if (!isAuthorized) {
    res.writeHead(401, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ error: "Unauthorized print agent access token" }));
  }

  // 2. Printers List Endpoint
  if ((cleanPath === "/printers" || cleanPath === "/list") && req.method === "GET") {
    const printers = await getInstalledPrinters();
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ ok: true, printers }));
  }

  // 3. Print Spooling Endpoints (Flexible matching for /print, /print/tspl, /tspl, /api/print, /api/printer/print)
  if (
    cleanPath === "/print" ||
    cleanPath === "/print/tspl" ||
    cleanPath === "/tspl" ||
    cleanPath === "/api/print" ||
    cleanPath === "/api/printer/print" ||
    cleanPath.endsWith("/print") ||
    cleanPath.endsWith("/tspl")
  ) {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", async () => {
      try {
        const payload = JSON.parse(body || "{}");
        const { printerName = "SNBC TVSE LP46 Dlite BPLE", tsplData, tspl, copies = 1 } = payload;
        const dataToPrint = tsplData || tspl;

        if (!dataToPrint) {
          res.writeHead(400, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ error: "tsplData parameter is required" }));
        }

        const result = await sendRawToWindowsPrinter(printerName, dataToPrint);
        res.writeHead(200, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ ok: true, printerName, copies, result }));
      } catch (err) {
        res.writeHead(500, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ error: err.message || "Failed to process print job" }));
      }
    });
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: `Endpoint not found: ${req.url}` }));
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Print Agent active on http://127.0.0.1:${PORT}`);
});
