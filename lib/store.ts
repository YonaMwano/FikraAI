import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ModelPreference, Message, ChatSession } from "@/types";

interface AppState {
  // UI
  isAuthModalOpen: boolean;
  isSidebarOpen: boolean;
  isSettingsOpen: boolean;
  modelPreference: ModelPreference;

  // Chat
  currentSessionId: string | null;
  messages: Message[];
  sessions: ChatSession[];
  isStreaming: boolean;

  // Actions
  setAuthModalOpen: (open: boolean) => void;
  setSidebarOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  setModelPreference: (model: ModelPreference) => void;
  setCurrentSessionId: (id: string | null) => void;
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  updateLastMessage: (content: string) => void;
  setSessions: (sessions: ChatSession[]) => void;
  setIsStreaming: (streaming: boolean) => void;
  clearChat: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      isAuthModalOpen: false,
      isSidebarOpen: false,
      isSettingsOpen: false,
      modelPreference: "auto",
      currentSessionId: null,
      messages: [],
      sessions: [],
      isStreaming: false,

      setAuthModalOpen: (open) => set({ isAuthModalOpen: open }),
      setSidebarOpen: (open) => set({ isSidebarOpen: open }),
      setSettingsOpen: (open) => set({ isSettingsOpen: open }),
      setModelPreference: (model) => set({ modelPreference: model }),
      setCurrentSessionId: (id) => set({ currentSessionId: id }),
      setMessages: (messages) => set({ messages }),
      addMessage: (message) =>
        set((state) => ({ messages: [...state.messages, message] })),
      updateLastMessage: (content) =>
        set((state) => {
          const msgs = [...state.messages];
          if (msgs.length > 0) {
            msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], content };
          }
          return { messages: msgs };
        }),
      setSessions: (sessions) => set({ sessions }),
      setIsStreaming: (streaming) => set({ isStreaming: streaming }),
      clearChat: () =>
        set({
          currentSessionId: null,
          messages: [],
        }),
    }),
    {
      name: "fikra-ui-store",
      partialize: (state) => ({
        modelPreference: state.modelPreference,
      }),
    }
  )
);
