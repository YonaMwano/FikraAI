"use client";

import { useState, useRef, useEffect } from "react";
import {
  Plus,
  Mic,
  Send,
  Image as ImageIcon,
  FileText,
  Upload,
  X,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { createClient } from "@/lib/supabase/client";
import { generateId } from "@/lib/utils";
import { detectIntent, type ChatIntent } from "@/lib/intent";
import { readChatStream } from "@/lib/chat-stream";
import type { Message } from "@/types";

interface ChatInputProps {
  user: any;
}

export function ChatInput({ user }: ChatInputProps) {
  const [value, setValue] = useState("");
  const [routing, setRouting] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [editingImageUrl, setEditingImageUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    isStreaming,
    setAuthModalOpen,
    modelPreference,
    currentSessionId,
    setCurrentSessionId,
    messages,
    addMessage,
    updateLastMessage,
    setIsStreaming,
    setMessages,
  } = useAppStore();

  const supabase = createClient();

  // Allow external components to trigger edit mode
  useEffect(() => {
    (window as any).__fikraSetEditImage = (url: string) => {
      setEditingImageUrl(url);
      setPendingImage(url);
    };

    // Listen for "Edit" button on messages – put text back into input
    const onEditMessage = (e: any) => {
      if (e.detail) {
        setValue(e.detail.content);
        setEditingMessageId(e.detail.id);
        setEditingImageUrl(null);
        setPendingImage(e.detail.imageUrl || null);
        textareaRef.current?.focus();
      }
    };
    window.addEventListener("fikra-edit-message", onEditMessage);

    return () => {
      delete (window as any).__fikraSetEditImage;
      window.removeEventListener("fikra-edit-message", onEditMessage);
    };
  }, []);

  const handleAttachment = (type: "image" | "document" | "upload") => {
    setMenuOpen(false);
    if (!user && (type === "image" || type === "document")) {
      setAuthModalOpen(true);
      return;
    }
    if (type === "image" || type === "upload") {
      fileInputRef.current?.click();
    }
    if (type === "document") {
      setValue(
        "Write a professional 2-page business proposal and format it as a document."
      );
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setPendingImage(reader.result as string);
      setEditingImageUrl(null);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const ensureSession = async (): Promise<string> => {
    if (currentSessionId) return currentSessionId;
    if (user) {
      const { data, error } = await supabase
        .from("chat_sessions")
        .insert({
          user_id: user.id,
          title: "New Chat",
          model_preference: modelPreference,
          is_guest: false,
        })
        .select()
        .single();
      if (error || !data) {
        const localId = generateId();
        setCurrentSessionId(localId);
        return localId;
      }
      setCurrentSessionId(data.id);
      return data.id;
    }
    const localId = generateId();
    setCurrentSessionId(localId);
    return localId;
  };

  const persistUserMessage = async (sessionId: string, msg: Message) => {
    if (!user) return;
    await supabase.from("messages").insert({
      session_id: sessionId,
      role: "user",
      content: msg.content,
      image_url: msg.image_url,
    });
  };

  // IMAGE GENERATION
  const handleImageGen = async (prompt: string, sessionId: string) => {
    setIsStreaming(true);
    const assistantId = generateId();
    addMessage({
      id: assistantId,
      role: "assistant",
      content: "Generating your image…",
    });

    try {
      const res = await fetch("/api/image/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, name: `Fikra-${Date.now()}` }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error("Image request failed");

      if (data.status === "completed" && data.imageUrl) {
        const msgs = useAppStore.getState().messages;
        setMessages(
          msgs.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: prompt,
                  image_url: data.imageUrl,
                  model_used: data.model || "z-image-turbo",
                }
              : m
          )
        );
        if (user) {
          await supabase.from("messages").insert({
            session_id: sessionId,
            role: "assistant",
            content: prompt,
            image_url: data.imageUrl,
            model_used: data.model || "z-image-turbo",
          });
        }
      } else {
        updateLastMessage(
          data.message ||
            "Image is still being generated. Please wait a few seconds and try again, or check your MagicHour dashboard."
        );
      }
    } catch (err) {
      console.error(err);
      updateLastMessage("Sorry, image generation failed. Please try again.");
    } finally {
      setIsStreaming(false);
    }
  };

  // IMAGE EDIT
  const handleImageEdit = async (
    prompt: string,
    imageUrl: string,
    sessionId: string
  ) => {
    setIsStreaming(true);
    const assistantId = generateId();
    addMessage({
      id: assistantId,
      role: "assistant",
      content: "Editing your image…",
    });

    try {
      const res = await fetch("/api/image/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          imageUrl,
          name: `Fikra-Edit-${Date.now()}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error("Image request failed");

      if (data.status === "completed" && data.imageUrl) {
        const msgs = useAppStore.getState().messages;
        setMessages(
          msgs.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: prompt,
                  image_url: data.imageUrl,
                  original_url: data.originalUrl || imageUrl,
                  model_used: data.model || "qwen-image-2.1",
                }
              : m
          )
        );
        if (user) {
          await supabase.from("messages").insert({
            session_id: sessionId,
            role: "assistant",
            content: prompt,
            image_url: data.imageUrl,
            model_used: data.model || "qwen-image-2.1",
            metadata: { original_url: data.originalUrl || imageUrl },
          });
        }
      } else {
        updateLastMessage(
          data.message ||
            "Image edit is still processing. Please wait a few seconds and try again."
        );
      }
    } catch (err) {
      console.error(err);
      updateLastMessage("Sorry, image editing failed. Please try again.");
    } finally {
      setIsStreaming(false);
      setEditingImageUrl(null);
      setPendingImage(null);
    }
  };

  // DOCUMENT GENERATION
  const handleDocumentGen = async (prompt: string, sessionId: string, format: ChatIntent["format"], history: Message[]) => {
    setIsStreaming(true);
    const assistantId = generateId();
    addMessage({ id: assistantId, role: "assistant", content: "" });

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content:
                `You are a professional document writer. Return only the finished document in Markdown: a clear title, logical headings, concise paragraphs and well-structured tables where useful. No chat preamble, no code fences, no print instructions, no artificial page breaks or empty filler. Requested file format: ${format}. For spreadsheets, put the main data in GFM tables with clear column headers, units and numeric values. Use the conversation to populate the document; do not invent facts or claim unavailable data is verified.`,
            },
            ...history.slice(-12).map(m => ({ role: m.role, content: m.content })),
            { role: "user", content: prompt },
          ],
          modelPreference: "auto",
        }),
      });
      if (!res.ok) throw new Error("Failed");

      const full = await readChatStream(res, updateLastMessage);
      const title = full.split("\n").find(line => line.trim())?.replace(/^#+\s*/, "").replace(/[^\p{L}\p{N} _-]/gu, "").trim().slice(0, 70) || "Document";
      const docName = `${title}.${format}`;

      const msgs = useAppStore.getState().messages;
      setMessages(
        msgs.map((m) =>
          m.id === assistantId
            ? { ...m, content: full, document_name: docName }
            : m
        )
      );

      if (user) {
        await supabase.from("messages").insert({
          session_id: sessionId,
          role: "assistant",
          content: full,
          document_name: docName,
          model_used: "openai/gpt-oss-120b",
        });
      }
    } catch (err) {
      console.error(err);
      updateLastMessage("Sorry, document generation failed.");
    } finally {
      setIsStreaming(false);
    }
  };

  // MAIN SEND
  const handleSend = async () => {
    if ((!value.trim() && !pendingImage) || routing || useAppStore.getState().isStreaming) return;
    const text = value.trim();
    setRouting(true);
    setMenuOpen(false);
    let intent = detectIntent(text, Boolean(pendingImage));
    const history = messages;
    try {
      const response = await fetch("/api/intent", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, history: history.slice(-6), hasImage: Boolean(pendingImage) }),
      });
      if (response.ok) intent = await response.json();
    } catch { /* Local detection remains available if classification is unavailable. */ }
    if (intent.action === "chat" && modelPreference === "image-gen" && !pendingImage) intent.action = "image-generate";
    if (pendingImage && (editingImageUrl || modelPreference === "image-edit")) intent.action = "image-edit";
    const prompt = intent.prompt || text;
    let sessionId: string;
    try { sessionId = await ensureSession(); }
    catch { setRouting(false); return; }
    setValue("");
    setEditingMessageId(null);
    setIsStreaming(true);
    setRouting(false);

    const userMsg: Message = {
      id: generateId(),
      role: "user",
      content: text || (pendingImage ? "Analyze this image" : ""),
      image_url: pendingImage || undefined,
    };
    addMessage(userMsg);
    try { await persistUserMessage(sessionId, userMsg); } catch { /* Continue the response if chat history is temporarily unavailable. */ }

    if (intent.action === "image-generate" && !pendingImage) {
      await handleImageGen(prompt, sessionId);
      return;
    }

    if (intent.action === "image-edit" && (pendingImage || editingImageUrl)) {
      await handleImageEdit(
        prompt || "Improve this image",
        pendingImage || editingImageUrl!,
        sessionId
      );
      return;
    }

    if (intent.action === "document") {
      await handleDocumentGen(prompt, sessionId, intent.format, history);
      setPendingImage(null);
      setEditingImageUrl(null);
      return;
    }

    // Default text / vision
    const apiMessages = [
      ...history.map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: userMsg.content },
    ];

    setIsStreaming(true);
    const assistantId = generateId();
    addMessage({ id: assistantId, role: "assistant", content: "" });

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: apiMessages,
          modelPreference,
          sessionId,
          imageBase64: pendingImage,
        }),
      });
      if (!res.ok) throw new Error("Failed");

      await readChatStream(res, updateLastMessage);
    } catch (err) {
      console.error(err);
      updateLastMessage("Sorry, something went wrong. Please try again.");
    } finally {
      setIsStreaming(false);
      setPendingImage(null);
      setEditingImageUrl(null);
    }
  };

  useEffect(() => {
    const el = textareaRef.current;
    if (el) { el.style.height = "auto"; el.style.height = `${Math.min(el.scrollHeight, 160)}px`; }
  }, [value]);

  return (
    <div className="mx-auto w-full max-w-3xl">
      {editingMessageId && (
        <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
          Editing your question · resend your changes
          <button onClick={() => { setEditingMessageId(null); setValue(""); setPendingImage(null); }} className="p-2" aria-label="Cancel editing"><X className="h-4 w-4" /></button>
        </div>
      )}
      {pendingImage && (
        <div className="mb-3 flex items-center gap-3 rounded-xl border border-border bg-muted/50 p-2">
          <img
            src={pendingImage}
            alt="Pending"
            className="h-16 w-16 rounded-lg object-cover"
          />
          <div className="flex-1 text-sm text-muted-foreground">
            {editingImageUrl
              ? "Image ready for editing – describe the changes"
              : "Image ready to send"}
          </div>
          <button
            onClick={() => {
              setPendingImage(null);
              setEditingImageUrl(null);
            }}
            className="rounded-full p-1 hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="relative rounded-2xl border border-border bg-background shadow-sm transition focus-within:ring-2 focus-within:ring-primary/20">
        {menuOpen && (
          <div className="absolute bottom-full left-3 mb-2 w-56 rounded-xl border border-border bg-background p-1.5 shadow-xl">
            <button
              onClick={() => handleAttachment("image")}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-muted"
            >
              <ImageIcon className="h-4 w-4 text-primary" />
              Upload Image (Vision)
            </button>
            <button
              onClick={() => handleAttachment("document")}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-muted"
            >
              <FileText className="h-4 w-4 text-primary" />
              Generate Document
            </button>
            <button
              onClick={() => handleAttachment("upload")}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-muted"
            >
              <Upload className="h-4 w-4 text-primary" />
              Upload Document
            </button>
          </div>
        )}

        <div className="flex items-end gap-2 p-3">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="mb-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-muted"
          >
            <Plus className="h-5 w-5" />
          </button>

          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={
              modelPreference === "image-gen"
                ? "Describe the image you want to generate…"
                : modelPreference === "image-edit"
                ? "Describe how to edit the image…"
                : "Ask Fikra AI…"
            }
            rows={1}
            className="max-h-40 min-w-0 flex-1 resize-none bg-transparent py-2.5 text-base outline-none placeholder:text-muted-foreground"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                handleSend();
              }
            }}
          />

          <div className="mb-1 flex items-center gap-1">
            <button className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted">
              <Mic className="h-5 w-5" />
            </button>
            <button
              onClick={handleSend}
              aria-label={routing ? "Choosing the right tool" : "Send message"}
              disabled={
                (!value.trim() && !pendingImage) ||
                (isStreaming || routing)
              }
              className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground transition disabled:opacity-40"
            >
              <Send className={`h-4 w-4 ${routing ? "animate-pulse" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      <p className="mt-2 text-center text-xs text-muted-foreground">
        Fikra AI can make mistakes. Check important information.
      </p>
    </div>
  );
}
