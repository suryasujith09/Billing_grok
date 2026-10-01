"use client";

import { useState } from "react";
import type { PrintLog } from "@prisma/client";
import { printTagAction, bulkPrintTagsAction, getPrintHistory } from "@/lib/printer-actions";
import {
  Printer,
  Eye,
  History,
  CheckSquare,
  Square,
  Layers,
  CheckCircle2,
  AlertTriangle,
  X,
} from "lucide-react";

interface InventoryTagActionsProps {
  items: Array<{
    id: string;
    tagNo: string;
    name: string;
    category: string;
    metal: string;
    purity: string;
    grossWeight: number;
    netWeight: number;
    stoneWeight: number;
    huid: string;
    printCount: number;
    lastPrintedAt?: string | Date | null;
  }>;
}

export function InventoryTagActions({ items }: InventoryTagActionsProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeModal, setActiveModal] = useState<"preview" | "history" | null>(null);
  const [modalItem, setModalItem] = useState<InventoryTagActionsProps["items"][number] | null>(null);
  const [historyLogs, setHistoryLogs] = useState<PrintLog[]>([]);
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const toggleSelectAll = () => {
    if (selectedIds.length === items.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(items.map((i) => i.id));
    }
  };

  const toggleSelectItem = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handlePrintSingle = async (ornamentId: string, tagNo: string) => {
    setLoading(true);
    setToast(null);
    const res = await printTagAction({ ornamentId, tagNo, copies: 1 });
    setLoading(false);
    if (res.ok) {
      setToast({ type: "success", text: `Tag ${tagNo} sent to TVS LP 46 Dlite printer!` });
    } else {
      setToast({ type: "error", text: res.error || `Failed to print tag ${tagNo}` });
    }
  };

  const handleBulkPrintSelected = async () => {
    if (selectedIds.length === 0) return;
    setLoading(true);
    setToast(null);

    const res = await bulkPrintTagsAction({ ornamentIds: selectedIds, copies: 1 });
    setLoading(false);

    if (res.ok) {
      setToast({
        type: "success",
        text: `Bulk printed ${res.successCount} tag(s) successfully!`,
      });
      setSelectedIds([]);
    } else {
      setToast({
        type: "error",
        text: `Printed ${res.successCount} of ${res.total}. Failed: ${res.failCount}`,
      });
    }
  };

  const handlePrintAllUnprinted = async () => {
    const unprinted = items.filter((i) => (i.printCount || 0) === 0).map((i) => i.id);
    if (unprinted.length === 0) {
      setToast({ type: "error", text: "No unprinted tags found in current view." });
      return;
    }
    setLoading(true);
    setToast(null);

    const res = await bulkPrintTagsAction({ ornamentIds: unprinted, copies: 1 });
    setLoading(false);

    if (res.ok) {
      setToast({
        type: "success",
        text: `Printed all ${res.successCount} unprinted tag(s)!`,
      });
    } else {
      setToast({
        type: "error",
        text: `Printed ${res.successCount} unprinted tags. Failed: ${res.failCount}`,
      });
    }
  };

  const openHistoryModal = async (tagNo?: string) => {
    setLoading(true);
    const logs = await getPrintHistory(tagNo);
    setHistoryLogs(logs);
    setLoading(false);
    setActiveModal("history");
  };

  return (
    <div className="space-y-4">
      {/* Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-royal-card p-4 shadow-md">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleSelectAll}
            className="flex items-center gap-2 text-xs font-semibold text-cream/80 hover:text-cream"
          >
            {selectedIds.length === items.length && items.length > 0 ? (
              <CheckSquare size={16} className="text-gold" />
            ) : (
              <Square size={16} className="text-cream/40" />
            )}
            <span>
              {selectedIds.length > 0 ? `${selectedIds.length} Selected` : "Select All"}
            </span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {selectedIds.length > 0 && (
            <button
              type="button"
              onClick={handleBulkPrintSelected}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-lg bg-gold px-3.5 py-1.5 text-xs font-bold text-royal-deep hover:bg-gold-bright transition shadow-sm disabled:opacity-50"
            >
              <Printer size={14} /> Bulk Print ({selectedIds.length})
            </button>
          )}

          <button
            type="button"
            onClick={handlePrintAllUnprinted}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg border border-gold/40 bg-gold/10 px-3 py-1.5 text-xs font-semibold text-gold-bright hover:bg-gold/20 transition disabled:opacity-50"
          >
            <Layers size={14} /> Print All Unprinted
          </button>

          <button
            type="button"
            onClick={() => openHistoryModal()}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-cream/80 hover:bg-white/5 hover:text-cream transition"
          >
            <History size={14} /> Print History
          </button>
        </div>
      </div>

      {toast && (
        <div
          className={`rounded-lg p-3 text-xs font-medium border flex items-center justify-between ${
            toast.type === "success"
              ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
              : "bg-rose-500/15 border-rose-500/30 text-rose-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {toast.type === "success" ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
            <span>{toast.text}</span>
          </div>
          <button type="button" onClick={() => setToast(null)} className="p-1 opacity-70 hover:opacity-100">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Main Stock Table with Checkboxes & Direct Print Actions */}
      <div className="rounded-xl border border-white/10 bg-royal-card shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-cream">
            <thead className="bg-white/5 uppercase tracking-wider text-cream/60 border-b border-white/10 font-semibold">
              <tr>
                <th className="px-3 py-3 w-10 text-center">#</th>
                <th className="px-3 py-3">Tag ID</th>
                <th className="px-3 py-3">Item Name</th>
                <th className="px-3 py-3">Category</th>
                <th className="px-3 py-3">Metal / Purity</th>
                <th className="px-3 py-3 text-right">Net Wt</th>
                <th className="px-3 py-3 text-center">Prints</th>
                <th className="px-3 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {items.map((item) => {
                const isSelected = selectedIds.includes(item.id);
                return (
                  <tr
                    key={item.id}
                    className={`hover:bg-white/5 transition ${
                      isSelected ? "bg-gold/10" : ""
                    }`}
                  >
                    <td className="px-3 py-2.5 text-center">
                      <button
                        type="button"
                        onClick={() => toggleSelectItem(item.id)}
                        className="p-1 text-cream/70 hover:text-gold"
                      >
                        {isSelected ? (
                          <CheckSquare size={16} className="text-gold" />
                        ) : (
                          <Square size={16} className="text-cream/40" />
                        )}
                      </button>
                    </td>

                    <td className="px-3 py-2.5 font-mono font-bold text-gold-bright">
                      {item.tagNo}
                    </td>

                    <td className="px-3 py-2.5 font-medium">{item.name}</td>
                    <td className="px-3 py-2.5 text-cream/70">{item.category}</td>
                    <td className="px-3 py-2.5 text-cream/80">
                      {item.metal} {item.purity}
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold">
                      {item.netWeight.toFixed(3)}g
                    </td>

                    <td className="px-3 py-2.5 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.printCount > 0
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                        }`}
                      >
                        {item.printCount > 0 ? `${item.printCount} Printed` : "Unprinted"}
                      </span>
                    </td>

                    <td className="px-3 py-2.5 text-right space-x-1">
                      <button
                        type="button"
                        onClick={() => {
                          setModalItem(item);
                          setActiveModal("preview");
                        }}
                        className="inline-flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 text-[11px] text-cream/80 hover:bg-white/10 hover:text-cream transition"
                        title="Preview Butterfly Tag"
                      >
                        <Eye size={12} /> Preview
                      </button>

                      <button
                        type="button"
                        onClick={() => handlePrintSingle(item.id, item.tagNo)}
                        disabled={loading}
                        className="inline-flex items-center gap-1 rounded-md bg-gold/20 border border-gold/40 px-2 py-1 text-[11px] font-semibold text-gold-bright hover:bg-gold/30 transition disabled:opacity-50"
                        title="Print Tag to TVS LP 46 Dlite"
                      >
                        <Printer size={12} /> {item.printCount > 0 ? "Reprint" : "Print"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Preview Butterfly Tag */}
      {activeModal === "preview" && modalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-xl border border-white/15 bg-royal-deep text-cream shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-bold text-gold-bright text-base">
                Tag Preview: {modalItem.tagNo}
              </h3>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="text-cream/60 hover:text-cream"
              >
                <X size={18} />
              </button>
            </div>

            {/* Simulated 60x25 mm Butterfly Tag */}
            <div className="flex justify-center p-4 bg-black/40 rounded-lg">
              <div className="relative w-[480px] h-[200px] bg-white rounded-xs border-2 border-amber-400 p-2 text-black font-sans flex justify-between shadow-xl">
                {/* Left Wing */}
                <div className="w-[210px] space-y-1">
                  <p className="text-[11px] font-bold tracking-tight">SURYA GOLD & DIAMONDS</p>
                  <p className="text-[12px] font-mono font-bold">{modalItem.tagNo}</p>
                  <div className="bg-black text-[10px] text-white font-mono p-1 text-center font-bold tracking-widest my-1">
                    |||||| ||| |||| |
                  </div>
                  <p className="text-[10px] text-gray-700">HUID: {modalItem.huid || "N/A"}</p>
                </div>

                {/* Center Narrow Tail (Adhesive Loop) */}
                <div className="w-[32px] bg-amber-100 border-x border-dashed border-amber-400 flex items-center justify-center">
                  <span className="text-[8px] font-bold text-amber-800 -rotate-90 whitespace-nowrap">
                    LOOP / TAIL
                  </span>
                </div>

                {/* Right Wing */}
                <div className="w-[210px] text-right space-y-1">
                  <p className="text-[12px] font-bold text-amber-900">{modalItem.metal} {modalItem.purity}</p>
                  <p className="text-[10px] font-medium">GW: {Number(modalItem.grossWeight || 0).toFixed(3)}g</p>
                  <p className="text-[10px] font-bold">NW: {Number(modalItem.netWeight || 0).toFixed(3)}g</p>
                  {modalItem.stoneWeight > 0 && (
                    <p className="text-[9px] text-gray-600">SW: {Number(modalItem.stoneWeight).toFixed(3)}g</p>
                  )}
                  <p className="text-[10px] font-semibold text-gray-800 uppercase">{modalItem.name}</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="rounded-lg border border-white/10 px-4 py-2 text-xs text-cream/70 hover:bg-white/5"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveModal(null);
                  handlePrintSingle(modalItem.id, modalItem.tagNo);
                }}
                className="flex items-center gap-1.5 rounded-lg bg-gold px-4 py-2 text-xs font-bold text-royal-deep hover:bg-gold-bright"
              >
                <Printer size={14} /> Send to TVS Printer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Print History Logs */}
      {activeModal === "history" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-3xl rounded-xl border border-white/15 bg-royal-deep text-cream shadow-2xl p-6 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-bold text-gold-bright text-base flex items-center gap-2">
                <History size={18} /> Hardware Print Audit History
              </h3>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="text-cream/60 hover:text-cream"
              >
                <X size={18} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 pr-1">
              <table className="w-full text-left text-xs text-cream">
                <thead className="bg-white/5 uppercase tracking-wider text-cream/60 border-b border-white/10 font-semibold sticky top-0">
                  <tr>
                    <th className="px-3 py-2">Timestamp</th>
                    <th className="px-3 py-2">Tag ID</th>
                    <th className="px-3 py-2">Printer Name</th>
                    <th className="px-3 py-2">Printed By</th>
                    <th className="px-3 py-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {historyLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-white/5">
                      <td className="px-3 py-2 text-cream/60 font-mono">
                        {new Date(log.createdAt).toLocaleString("en-IN")}
                      </td>
                      <td className="px-3 py-2 font-mono font-bold text-gold-bright">
                        {log.tagNo}
                      </td>
                      <td className="px-3 py-2 text-cream/80">{log.printerName}</td>
                      <td className="px-3 py-2 text-cream/70">{log.printedBy}</td>
                      <td className="px-3 py-2 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            log.status === "SUCCESS"
                              ? "bg-emerald-500/20 text-emerald-300"
                              : "bg-rose-500/20 text-rose-300"
                          }`}
                        >
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {historyLogs.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-cream/40 italic">
                        No print history records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
