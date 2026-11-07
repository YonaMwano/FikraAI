"use client";

import { Sparkles } from "lucide-react";

export function ImageGenerating({ prompt }: { prompt?: string }) {
  return (
    <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-muted/40">
      <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden bg-gradient-to-br from-primary/5 via-muted to-primary/10">
        {/* Animated background shimmer */}
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        <div className="relative z-10 flex flex-col items-center gap-3 px-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/15">
            <Sparkles className="h-6 w-6 animate-pulse text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium">Generating image…</p>
            {prompt && (
              <p className="mt-1 max-w-xs truncate text-xs text-muted-foreground">
                {prompt}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
