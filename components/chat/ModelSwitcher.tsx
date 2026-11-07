"use client";

import { useAppStore } from "@/lib/store";
import { ChevronDown, Sparkles, Eye, Image, Paintbrush } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import type { ModelPreference } from "@/types";

const models: {
  id: ModelPreference;
  label: string;
  icon: any;
  desc: string;
}[] = [
  { id: "auto", label: "Fikra Auto", icon: Sparkles, desc: "Smart routing" },
  { id: "vision", label: "Vision", icon: Eye, desc: "Image analysis" },
  { id: "image-gen", label: "Image Gen", icon: Image, desc: "Create images" },
  {
    id: "image-edit",
    label: "Image Edit",
    icon: Paintbrush,
    desc: "Edit images",
  },
];

export function ModelSwitcher() {
  const { modelPreference, setModelPreference } = useAppStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = models.find((m) => m.id === modelPreference) || models[0];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-sm font-medium transition hover:bg-muted"
      >
        <current.icon className="h-4 w-4 text-primary" />
        {current.label}
        <ChevronDown className="h-3.5 w-3.5 opacity-60" />
      </button>

      {open && (
        <div className="absolute left-1/2 top-full z-50 mt-2 w-64 -translate-x-1/2 rounded-xl border border-border bg-background p-1.5 shadow-xl">
          {models.map((model) => (
            <button
              key={model.id}
              onClick={() => {
                setModelPreference(model.id);
                setOpen(false);
              }}
              className={`flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition ${
                modelPreference === model.id
                  ? "bg-primary/10 text-primary"
                  : "hover:bg-muted"
              }`}
            >
              <model.icon className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="text-sm font-medium">{model.label}</p>
                <p className="text-xs text-muted-foreground">{model.desc}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
