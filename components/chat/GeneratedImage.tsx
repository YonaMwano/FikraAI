"use client";

import { useState } from "react";
import { Download, RefreshCw, Paintbrush, Lock } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { createClient } from "@/lib/supabase/client";

interface GeneratedImageProps {
  imageUrl: string;
  originalUrl?: string;
  prompt?: string;
  model?: string;
  user: any;
  onEdit?: (url: string) => void;
  onRegenerate?: () => void;
}

export function GeneratedImage({
  imageUrl,
  originalUrl,
  prompt,
  model,
  user,
  onEdit,
  onRegenerate,
}: GeneratedImageProps) {
  const { setAuthModalOpen } = useAppStore();
  const [showBeforeAfter, setShowBeforeAfter] = useState(false);
  const [sliderPos, setSliderPos] = useState(50);

  const handleDownload = async () => {
    if (!user) {
      setAuthModalOpen(true);
      return;
    }

    try {
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `fikra-ai-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Download failed", e);
      // Fallback open in new tab
      window.open(imageUrl, "_blank");
    }
  };

  return (
    <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-muted/30">
      {/* Image area */}
      <div className="relative aspect-video w-full overflow-hidden bg-black/5">
        {originalUrl && showBeforeAfter ? (
          <div className="relative h-full w-full">
            {/* After (edited) */}
            <img
              src={imageUrl}
              alt="After"
              className="absolute inset-0 h-full w-full object-contain"
            />
            {/* Before with clip */}
            <div
              className="absolute inset-0 overflow-hidden"
              style={{ width: `${sliderPos}%` }}
            >
              <img
                src={originalUrl}
                alt="Before"
                className="h-full w-full max-w-none object-contain"
                style={{ width: `${100 / (sliderPos / 100)}%` }}
              />
            </div>
            {/* Slider */}
            <input
              type="range"
              min={0}
              max={100}
              value={sliderPos}
              onChange={(e) => setSliderPos(Number(e.target.value))}
              className="absolute bottom-3 left-1/2 w-3/4 -translate-x-1/2 accent-primary"
            />
            <div className="absolute left-3 top-3 rounded bg-black/60 px-2 py-0.5 text-xs text-white">
              Before
            </div>
            <div className="absolute right-3 top-3 rounded bg-black/60 px-2 py-0.5 text-xs text-white">
              After
            </div>
          </div>
        ) : (
          <img
            src={imageUrl}
            alt={prompt || "Generated image"}
            className="h-full w-full object-contain"
          />
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2 border-t border-border p-3">
        <button
          onClick={handleDownload}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition hover:opacity-90"
        >
          {user ? (
            <Download className="h-3.5 w-3.5" />
          ) : (
            <Lock className="h-3.5 w-3.5" />
          )}
          Download
        </button>

        {onRegenerate && (
          <button
            onClick={onRegenerate}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium transition hover:bg-muted"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Regenerate
          </button>
        )}

        {onEdit && (
          <button
            onClick={() => onEdit(imageUrl)}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium transition hover:bg-muted"
          >
            <Paintbrush className="h-3.5 w-3.5" />
            Edit
          </button>
        )}

        {originalUrl && (
          <button
            onClick={() => setShowBeforeAfter(!showBeforeAfter)}
            className="ml-auto text-xs text-muted-foreground hover:text-foreground"
          >
            {showBeforeAfter ? "Hide comparison" : "Before / After"}
          </button>
        )}

        {model && (
          <span className="ml-auto text-xs text-muted-foreground">
            {model}
          </span>
        )}
      </div>
    </div>
  );
}
