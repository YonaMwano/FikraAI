"use client";

import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/lib/store";
import { Lock } from "lucide-react";
import { useEffect } from "react";

interface AuthGateModalProps {
  open: boolean;
}

export function AuthGateModal({ open }: AuthGateModalProps) {
  const { setAuthModalOpen } = useAppStore();
  const supabase = createClient();

  // Auto-close if user somehow becomes logged in while modal is open
  useEffect(() => {
    if (!open) return;
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setAuthModalOpen(false);
      }
    };
    check();
  }, [open]);

  if (!open) return null;

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`,
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-background p-6 shadow-2xl">
        <div className="mb-4 flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Lock className="h-6 w-6 text-primary" />
          </div>
        </div>
        <h2 className="mb-2 text-center text-lg font-semibold">
          Sign in required
        </h2>
        <p className="mb-6 text-center text-sm text-muted-foreground">
          Sign in to upload files and save your documents.
        </p>
        <button
          onClick={handleGoogle}
          className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition hover:opacity-90"
        >
          Continue with Google
        </button>
        <button
          onClick={() => setAuthModalOpen(false)}
          className="w-full rounded-xl px-4 py-2.5 text-sm text-muted-foreground hover:bg-muted"
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}
