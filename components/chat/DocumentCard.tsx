"use client";

import { FileText, Download, Lock } from "lucide-react";
import { useAppStore } from "@/lib/store";

interface DocumentCardProps {
  name: string;
  url?: string;
  content?: string; // for simple text/markdown fallback
  user: any;
}

export function DocumentCard({ name, url, content, user }: DocumentCardProps) {
  const { setAuthModalOpen } = useAppStore();

  const handleDownload = () => {
    if (!user) {
      setAuthModalOpen(true);
      return;
    }

    if (url) {
      window.open(url, "_blank");
      return;
    }

    // Fallback: download as text file
    if (content) {
      const blob = new Blob([content], { type: "text/plain" });
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = name.endsWith(".txt") || name.endsWith(".md")
        ? name
        : `${name}.txt`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
    }
  };

  return (
    <div className="mt-3 flex items-center gap-3 rounded-2xl border border-border bg-muted/40 p-4">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
        <FileText className="h-6 w-6 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{name}</p>
        <p className="text-xs text-muted-foreground">
          Generated document · Click to download
        </p>
      </div>
      <button
        onClick={handleDownload}
        className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground transition hover:opacity-90"
      >
        {user ? (
          <Download className="h-3.5 w-3.5" />
        ) : (
          <Lock className="h-3.5 w-3.5" />
        )}
        Download
      </button>
    </div>
  );
}
