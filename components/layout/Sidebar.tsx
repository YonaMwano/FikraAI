"use client";

import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/lib/store";
import { MessageSquarePlus, LogOut, User, MessageSquare, MoreHorizontal, Trash2, Loader2 } from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { formatRelativeTime } from "@/lib/utils";
import { useEffect, useState } from "react";
import type { ChatSession } from "@/types";

interface SidebarProps {
  user: any;
  onClose?: () => void;
}

export function Sidebar({ user, onClose }: SidebarProps) {
  const supabase = createClient();
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const {
    sessions,
    setSessions,
    currentSessionId,
    setCurrentSessionId,
    setMessages,
    clearChat,
    isStreaming,
  } = useAppStore();

  // Load sessions when user is available
  useEffect(() => {
    if (!user) {
      setSessions([]);
      return;
    }

    const load = async () => {
      const { data } = await supabase
        .from("chat_sessions")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(50);

      if (data) setSessions(data as ChatSession[]);
    };
    load();
  }, [user]);

  const handleSignIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`,
      },
    });
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    clearChat();
    setSessions([]);
    onClose?.();
  };

  const handleNewChat = () => {
    clearChat();
    onClose?.();
  };

  const handleSelectSession = async (session: ChatSession) => {
    setCurrentSessionId(session.id);
    onClose?.();

    // Load messages
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("session_id", session.id)
      .order("created_at", { ascending: true });

    if (data) {
      setMessages(
        data.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content || "",
          image_url: m.image_url,
          document_url: m.document_url,
          document_name: m.document_name,
          model_used: m.model_used,
          created_at: m.created_at,
        }))
      );
    }
  };

  const handleDeleteSession = async (session: ChatSession) => {
    if (!user || deletingId || isStreaming) return;
    setDeletingId(session.id);
    setDeleteError("");
    try {
      const { data, error } = await supabase.from("chat_sessions")
        .delete().eq("id", session.id).eq("user_id", user.id).select("id");
      if (error || !data?.length) throw new Error("Delete failed");
      const state = useAppStore.getState();
      setSessions(state.sessions.filter(item => item.id !== session.id));
      if (state.currentSessionId === session.id) clearChat();
      setOpenMenu(null);
    } catch {
      setDeleteError("Could not delete this chat. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  // Group sessions
  const grouped = sessions.reduce(
    (acc, s) => {
      const group = formatRelativeTime(s.updated_at);
      if (!acc[group]) acc[group] = [];
      acc[group].push(s);
      return acc;
    },
    {} as Record<string, ChatSession[]>
  );

  const order = ["Today", "Previous 7 Days", "Older"];

  return (
    <aside className="flex h-full w-72 flex-col border-r border-border bg-muted/40">
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 py-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
          F
        </div>
        <span className="text-lg font-semibold tracking-tight">Fikra AI</span>
      </div>

      {/* New Chat */}
      <div className="px-3 pb-3">
        <button
          onClick={handleNewChat}
          className="flex w-full items-center gap-2 rounded-lg border border-border bg-background px-3 py-2.5 text-sm font-medium transition hover:bg-muted"
        >
          <MessageSquarePlus className="h-4 w-4" />
          New Chat
        </button>
      </div>

      {/* History */}
      <div className="flex-1 overflow-y-auto px-3">
        {user ? (
          order.map((group) =>
            grouped[group]?.length ? (
              <div key={group} className="mb-4">
                <p className="mb-1 px-2 text-xs font-medium text-muted-foreground">
                  {group}
                </p>
                <div className="space-y-0.5">
                  {grouped[group].map((session) => (
                    <div key={session.id} className={`rounded-lg text-sm ${currentSessionId === session.id ? "bg-primary/10 text-primary" : "hover:bg-muted"}`}>
                      <div className="flex items-center">
                        <button onClick={() => handleSelectSession(session)} disabled={isStreaming}
                          className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-2 text-left disabled:opacity-50">
                          <MessageSquare className="h-4 w-4 shrink-0 opacity-60" />
                          <span className="truncate">{session.title}</span>
                        </button>
                        <button type="button" aria-label={`Options for ${session.title}`} aria-expanded={openMenu === session.id}
                          aria-controls={`chat-options-${session.id}`} onClick={() => { setOpenMenu(openMenu === session.id ? null : session.id); setDeleteError(""); }}
                          className="mr-1 rounded-md p-2 hover:bg-background focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </div>
                      {openMenu === session.id && (
                        <div id={`chat-options-${session.id}`} className="px-2 pb-2" onKeyDown={event => { if (event.key === "Escape") setOpenMenu(null); }}>
                          <button type="button" onClick={() => handleDeleteSession(session)} disabled={!!deletingId || isStreaming}
                            className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-destructive hover:bg-destructive/10 disabled:opacity-50">
                            {deletingId === session.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            {deletingId === session.id ? "Deleting…" : "Delete chat"}
                          </button>
                          {deleteError && <p role="alert" className="px-2 py-1 text-xs text-destructive">{deleteError}</p>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : null
          )
        ) : (
          <p className="px-2 py-4 text-xs text-muted-foreground">
            Sign in to save and view chat history.
          </p>
        )}
      </div>

      {/* Bottom */}
      <div className="space-y-2 border-t border-border p-3">
        <ThemeToggle />
        {user ? (
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            {user.user_metadata?.avatar_url ? (
              <img
                src={user.user_metadata.avatar_url}
                alt=""
                className="h-8 w-8 rounded-full"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                <User className="h-4 w-4" />
              </div>
            )}
            <div className="flex-1 truncate text-sm">
              <p className="truncate font-medium">
                {user.user_metadata?.full_name || user.email}
              </p>
            </div>
            <button
              onClick={handleSignOut}
              className="rounded-md p-1.5 hover:bg-muted"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={handleSignIn}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            Sign in with Google
          </button>
        )}
      </div>
    </aside>
  );
}
