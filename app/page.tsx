"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { EmptyState } from "@/components/chat/EmptyState";
import { MessageList } from "@/components/chat/MessageList";
import { ChatInput } from "@/components/chat/ChatInput";
import { AuthGateModal } from "@/components/auth/AuthGateModal";
import { SettingsModal } from "@/components/layout/SettingsModal";
import { useAppStore } from "@/lib/store";

export default function HomePage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const {
    isSidebarOpen,
    setSidebarOpen,
    isAuthModalOpen,
    setAuthModalOpen,
    messages,
  } = useAppStore();
  const supabase = createClient();

  useEffect(() => {
    // Immediate session check
    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        setUser(session.user);
        setAuthModalOpen(false); // close any open auth modal
      }
      setLoading(false);
    };
    init();

    // Listen for auth changes (this fires after Google redirect)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        setUser(session?.user ?? null);
        setAuthModalOpen(false);
      } else if (event === "SIGNED_OUT") {
        setUser(null);
      } else {
        setUser(session?.user ?? null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleEditImage = (url: string) => {
    if (typeof window !== "undefined" && (window as any).__fikraSetEditImage) {
      (window as any).__fikraSetEditImage(url);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex">
        <Sidebar user={user} />
      </div>

      {/* Mobile Sidebar */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full w-72 bg-background shadow-xl">
            <Sidebar user={user} onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Main */}
      <div className="flex flex-1 flex-col">
        <Header user={user} onMenuClick={() => setSidebarOpen(true)} />

        <main className="relative flex flex-1 flex-col overflow-hidden">
          {messages.length === 0 ? (
            <EmptyState />
          ) : (
            <MessageList user={user} onEditImage={handleEditImage} />
          )}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background via-background to-transparent p-4 pb-6 pt-12">
            <ChatInput user={user} />
          </div>
        </main>
      </div>

      <AuthGateModal open={isAuthModalOpen} />
      <SettingsModal user={user} />
    </div>
  );
}
