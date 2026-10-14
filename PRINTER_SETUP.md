# TVS Electronics LP 46 Dlite + BS-L100 Plus — Jewellery Barcode Setup

## Overview
This document covers the **TVS Electronics LP 46 Dlite** (203 DPI) label printer, **TVS BS-L100 Plus** USB barcode scanner, and the Montex Gold **81 × 12 mm, 1-up** jewellery tags (SKU `LBC8910261125/3`) used by Surya Gold & Diamonds Billing ERP.

---

## 1. Printer Specifications
- **Printer Model**: TVS Electronics LP 46 Dlite
- **Resolution**: 203 DPI (8 dots per mm / 7.992 dots/mm)
- **Printing Technology**: Direct Thermal / Thermal Transfer
- **Command Set**: TSPL / TSPL-EZ
- **Supported Connection**: USB connected to Windows 11
- **Max Printable Width**: 108 mm
- **Jewellery Tag Size**: 81 × 12 mm, one tag across, 1-inch core
- **ERP barcode**: Code 128; printed inside the tag's 55 mm printable section
- **Default media gap**: 3 mm; calibrate the loaded roll and adjust this value if the printer feeds off the tag
- **Scanner connection**: USB HID keyboard mode; scan input ends with Enter

---

## 2. Local Windows Print Agent Installation

To print from the hosted billing website to a USB printer, the browser sends the print job directly to a local Windows Print Agent on the same PC. The hosted Vercel server cannot connect to `127.0.0.1` on your computer.

### Step 1: Start the Local Print Agent
Run the print agent service on the Windows 11 PC connected to the TVS printer:

```bash
npm run print-agent
```
*Alternatively, run:*
```bash
node src/print-agent/index.mjs
```

The print agent will start listening on `http://127.0.0.1:9191`. Keep this process running while printing. In production, the site may ask your browser for permission to access the local network; allow it for `billing-grok.vercel.app`.

If you use a different production domain, add it to `PRINT_AGENT_ALLOWED_ORIGINS` as a comma-separated list before starting the agent. The default allowed origins are the production billing site and local development at `localhost:3000` / `127.0.0.1:3000`.

### Step 2: Verify Agent Status
Navigate to `/settings` -> **TVS LP 46 Dlite Printer Settings** in the billing application.
You should see:
- **Agent Status**: Connected (Online)
- **Detected Printers**: List of installed Windows printers including `TVS LP 46 Dlite`.

---

## 3. Hardware Test & Calibration Checklist

Follow this 13-step checklist before beginning production label printing:

1. **Install Driver**: Install official TVS LP 46 Dlite Windows driver.
2. **Connect Hardware**: Plug TVS LP 46 Dlite into USB port on Windows 11 PC and power ON.
3. **Windows Test Print**: Open Windows Settings -> Printers & Scanners -> TVS LP 46 Dlite -> **Print Test Page**. Confirm page prints.
4. **Load Media Roll**: Insert the Montex Gold 81 × 12 mm, one-up tag roll. Use the correct ribbon/media combination for the printer and label coating.
5. **Measure Roll Dimensions**: Confirm the 81 mm tag length across the roll, 12 mm feed height, and the actual gap between tags.
6. **Calibrate Sensor**:
   - Turn printer power OFF.
   - Press and hold the **FEED** button while turning power ON.
   - Hold until red LED flashes, then release. The printer will feed 2-3 labels to automatically calibrate the gap sensor.
7. **Configure Printer Settings in ERP**:
   - Go to ERP **Settings** -> **TVS LP 46 Dlite Printer Settings**.
   - Set Width: `81 mm`, Height: `12 mm`, Gap: measured value (default `3 mm`), Density: `10`, Speed: `4`.
8. **Print ERP Test Label**: Click **Print Test Label (TVS LP 46 Dlite)**.
9. **Verify Text & Barcode Alignment**: Check the Code 128 bars and the readable tag number fit in the printable section; confirm the weight and purity text is legible.
10. **Set Up the Scanner**: Connect the BS-L100 Plus by USB. Use HID/keyboard mode and set an Enter suffix if the scanner is not already sending one. No browser plugin is required.
11. **Verify ERP Item Lookup**: Open `/billing`, click or focus the `SCAN BARCODE` field, scan the tag, and confirm the item loads into the bill. After adding, the field returns to focus for the next scan.
12. **Print Batch Test**: Select 5 items in Stock Inventory and click **Bulk Print Selected**.
13. **Alignment Audit**: Verify that all 5 tags print sequentially without skipping labels or drifting off margin.

---

## 4. Troubleshooting Guide

### Issue A: "Local Print Agent Offline" Banner
- **Cause**: The local agent is stopped, is running on a different PC, or the browser has not allowed the billing site to access the local network.
- **Solution**: On the PC connected to the printer, run `npm run print-agent`, allow local-network access for the billing site when prompted, and confirm the configured agent URL is `http://127.0.0.1:9191`.

### Issue B: Printer Skips Labels or Shifts Alignment
- **Cause**: Media gap sensor needs calibration or gap size mismatch.
- **Solution**: Perform Gap Sensor Calibration (Step 6 above) and ensure `Gap` is set to `3 mm` in Printer Settings.

### Issue C: Barcode Fails to Scan
- **Cause**: Thermal density too low (faint print) or quiet zone space too narrow.
- **Solution**: Increase Print Density to `12` or `14` in Printer Settings. Ensure Code 128 narrow bar is at least 2 dots wide.

### Issue D: Text or Barcode Prints Outside the Printable Area
- **Cause**: Tag feed direction, gap, or template alignment does not match the loaded roll.
- **Solution**: Calibrate the media, confirm the 81 × 12 mm size and measured gap, then print a single test tag before a batch. The supplied template keeps barcode and item text within the 55 mm printable area.

---

## 5. Security & Isolation

- **Token Authentication**: All print jobs sent to local print agent require HTTP Header `Authorization: Bearer surya-print-secret-token`.
- **Local Loopback Only**: Print Agent binds to `127.0.0.1` to prevent unauthorized network users from sending raw print commands.
- **Audit Logs**: Every print request is logged in the `PrintLog` table with timestamp, user ID, printer name, and status.
