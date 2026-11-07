"use client";

import { useState } from "react";
import { FileText, Download, Lock, Loader2 } from "lucide-react";
import { useAppStore } from "@/lib/store";

interface DocumentCardProps {
  name: string;
  url?: string;
  content?: string; // for simple text/markdown fallback
  user: any;
}

export function DocumentCard({ name, url, content, user }: DocumentCardProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [format, setFormat] = useState<"pdf" | "docx" | "xlsx">(/\.xlsx$/i.test(name) ? "xlsx" : /\.docx$/i.test(name) ? "docx" : "pdf");
  const { setAuthModalOpen } = useAppStore();

  const handleDownload = async () => {
    if (!user) {
      setAuthModalOpen(true);
      return;
    }

    if (busy) return;
    setError("");
    setBusy(true);
    try {
      if (!content) throw new Error("Document content is unavailable. Please regenerate it.");
      const { renderDocument } = await import("@/lib/document-export");
      const blob = await renderDocument(content, format);
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `${name.replace(/\.[^.]+$/, "")}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
    } catch (err) { setError(err instanceof Error ? err.message : "Download failed. Please try again."); }
    finally { setBusy(false); }
  };

  return (
    <div className="mt-3 flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-muted/40 p-4">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
        <FileText className="h-6 w-6 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{name}</p>
        <p className="text-xs text-muted-foreground">
          Generated document · Click to download
        </p>
      </div>
      <select aria-label="Download format" value={format} onChange={e => setFormat(e.target.value as typeof format)} disabled={busy} className="rounded-lg border border-border bg-background px-2 py-2 text-xs">
        <option value="pdf">PDF</option><option value="docx">Word</option><option value="xlsx">Excel</option>
      </select>
      <button
        disabled={busy}
        onClick={handleDownload}
        className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground transition hover:opacity-90"
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : user ? (
          <Download className="h-3.5 w-3.5" />
        ) : (
          <Lock className="h-3.5 w-3.5" />
        )}
        {busy ? "Rendering…" : "Download"}
      </button>
      {error && <p role="alert" className="w-full text-xs text-red-500">{error}</p>}
    </div>
  );
}
