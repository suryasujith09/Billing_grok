# TVS Electronics LP 46 Dlite — Jewellery Barcode Tagging & Print Setup Guide

## Overview
This document details the configuration, local Windows print agent installation, TSPL printer command setup, and hardware verification procedure for the **TVS Electronics LP 46 Dlite** (203 DPI) thermal label printer integrated into **Surya Gold & Diamonds Billing ERP**.

---

## 1. Printer Specifications
- **Printer Model**: TVS Electronics LP 46 Dlite
- **Resolution**: 203 DPI (8 dots per mm / 7.992 dots/mm)
- **Printing Technology**: Direct Thermal / Thermal Transfer
- **Command Set**: TSPL / TSPL-EZ
- **Supported Connection**: USB connected to Windows 11
- **Max Printable Width**: 108 mm
- **Standard Jewellery Tag Size**: 60 × 25 mm (Butterfly / Dumbbell Tag with 3 mm media gap)

---

## 2. Local Windows Print Agent Installation

To enable 1-click background USB printing directly from the web browser to the TVS printer, a local Windows Print Agent service is included.

### Step 1: Start the Local Print Agent
Run the print agent service on the Windows 11 PC connected to the TVS printer:

```bash
npm run print-agent
```
*Alternatively, run:*
```bash
node src/print-agent/index.mjs
```

The print agent will start listening on `http://127.0.0.1:9191`.

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
4. **Load Media Roll**: Insert 60 × 25 mm jewellery butterfly label roll. Ensure thermal ribbon is loaded smoothly if using thermal transfer mode.
5. **Measure Roll Dimensions**: Confirm physical width (60 mm), height (25 mm), and gap between labels (3 mm).
6. **Calibrate Sensor**:
   - Turn printer power OFF.
   - Press and hold the **FEED** button while turning power ON.
   - Hold until red LED flashes, then release. The printer will feed 2-3 labels to automatically calibrate the gap sensor.
7. **Configure Printer Settings in ERP**:
   - Go to ERP **Settings** -> **TVS LP 46 Dlite Printer Settings**.
   - Set Width: `60 mm`, Height: `25 mm`, Gap: `3 mm`, Density: `10`, Speed: `4`.
8. **Print ERP Test Label**: Click **Print Test Label (TVS LP 46 Dlite)**.
9. **Verify Text & Barcode Alignment**: Check that text is clear, centered on wings, and does not print across the middle adhesive loop.
10. **Scan Barcode**: Use your USB barcode scanner to scan the printed tag barcode (`SGD26RG00001`).
11. **Verify ERP Item Lookup**: Open `/billing`, scan the tag, and confirm the item automatically loads into the cart.
12. **Print Batch Test**: Select 5 items in Stock Inventory and click **Bulk Print Selected**.
13. **Alignment Audit**: Verify that all 5 tags print sequentially without skipping labels or drifting off margin.

---

## 4. Troubleshooting Guide

### Issue A: "Local Print Agent Offline" Banner
- **Cause**: The Node.js print agent background script is not running on the Windows machine.
- **Solution**: Open PowerShell / Command Prompt on the Windows PC and run `npm run print-agent`.

### Issue B: Printer Skips Labels or Shifts Alignment
- **Cause**: Media gap sensor needs calibration or gap size mismatch.
- **Solution**: Perform Gap Sensor Calibration (Step 6 above) and ensure `Gap` is set to `3 mm` in Printer Settings.

### Issue C: Barcode Fails to Scan
- **Cause**: Thermal density too low (faint print) or quiet zone space too narrow.
- **Solution**: Increase Print Density to `12` or `14` in Printer Settings. Ensure Code 128 narrow bar is at least 2 dots wide.

### Issue D: Text Printing Across Adhesive Tail
- **Cause**: Template elements configured inside the unprintable 28-32 mm center loop zone.
- **Solution**: Open **Label Template Designer** in ERP Settings and adjust element X coordinates to remain within Wing 1 (0-28 mm) or Wing 2 (32-60 mm).

---

## 5. Security & Isolation

- **Token Authentication**: All print jobs sent to local print agent require HTTP Header `Authorization: Bearer surya-print-secret-token`.
- **Local Loopback Only**: Print Agent binds to `127.0.0.1` to prevent unauthorized network users from sending raw print commands.
- **Audit Logs**: Every print request is logged in the `PrintLog` table with timestamp, user ID, printer name, and status.
