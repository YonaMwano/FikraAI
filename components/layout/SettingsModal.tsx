"use client";

import { useAppStore } from "@/lib/store";
import { createClient } from "@/lib/supabase/client";
import { X, Moon, Sun, LogOut, Trash2, User } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

interface SettingsModalProps {
  user: any;
}

export function SettingsModal({ user }: SettingsModalProps) {
  const { isSettingsOpen, setSettingsOpen, clearChat, setSessions } =
    useAppStore();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const supabase = createClient();

  useEffect(() => setMounted(true), []);

  if (!isSettingsOpen) return null;

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    clearChat();
    setSessions([]);
    setSettingsOpen(false);
  };

  const handleClearHistory = async () => {
    if (!confirm("Clear current chat? This cannot be undone.")) return;
    clearChat();
    setSettingsOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-background shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-lg font-semibold">Settings</h2>
          <button
            onClick={() => setSettingsOpen(false)}
            className="rounded-lg p-1.5 hover:bg-muted"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-1 p-3">
          {/* Profile */}
          {user && (
            <div className="mb-3 flex items-center gap-3 rounded-xl bg-muted/50 px-3 py-3">
              {user.user_metadata?.avatar_url ? (
                <img
                  src={user.user_metadata.avatar_url}
                  alt=""
                  className="h-10 w-10 rounded-full"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                  <User className="h-5 w-5" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {user.user_metadata?.full_name || "User"}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {user.email}
                </p>
              </div>
            </div>
          )}

          {/* Theme */}
          {mounted && (
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm transition hover:bg-muted"
            >
              {theme === "dark" ? (
                <>
                  <Sun className="h-4 w-4" />
                  Switch to Light mode
                </>
              ) : (
                <>
                  <Moon className="h-4 w-4" />
                  Switch to Dark mode
                </>
              )}
            </button>
          )}

          {/* Clear chat */}
          <button
            onClick={handleClearHistory}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm transition hover:bg-muted"
          >
            <Trash2 className="h-4 w-4" />
            Clear current chat
          </button>

          {/* Sign out */}
          {user && (
            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-red-500 transition hover:bg-red-500/10"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          )}
        </div>

        <div className="border-t border-border px-5 py-3 text-center text-xs text-muted-foreground">
          Fikra AI · No premium features
        </div>
      </div>
    </div>
  );
}
