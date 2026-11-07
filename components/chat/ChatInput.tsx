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
import type { Message } from "@/types";

interface ChatInputProps {
  user: any;
}

export function ChatInput({ user }: ChatInputProps) {
  const [value, setValue] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [editingImageUrl, setEditingImageUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
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
    return () => {
      delete (window as any).__fikraSetEditImage;
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
            "Image generation is processing. Please try again in a moment."
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
          data.message || "Image edit is processing. Please try again shortly."
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
  const handleDocumentGen = async (prompt: string, sessionId: string) => {
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
                "You are a professional document writer. Generate clean, well-structured content only.",
            },
            { role: "user", content: prompt },
          ],
          modelPreference: "auto",
          sessionId,
        }),
      });
      if (!res.ok) throw new Error("Failed");

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No stream");

      const decoder = new TextDecoder();
      let full = "";
      while (true) {
        const { done, value: chunk } = await reader.read();
        if (done) break;
        const textChunk = decoder.decode(chunk);
        const lines = textChunk.split("\n").filter((l) => l.trim());
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) {
                full += data.content;
                updateLastMessage(full);
              }
            } catch {}
          }
        }
      }

      const docName = lowerIncludes(prompt, "proposal")
        ? "Business_Proposal.md"
        : lowerIncludes(prompt, "report")
        ? "Report.md"
        : "Document.md";

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

  function lowerIncludes(text: string, word: string) {
    return text.toLowerCase().includes(word);
  }

  // MAIN SEND
  const handleSend = async () => {
    if ((!value.trim() && !pendingImage) || useAppStore.getState().isStreaming)
      return;

    const text = value.trim();
    setValue("");
    setMenuOpen(false);

    const sessionId = await ensureSession();

    const lower = text.toLowerCase();
    const isImageGenIntent =
      modelPreference === "image-gen" ||
      lower.startsWith("generate an image") ||
      lower.startsWith("create an image") ||
      lower.startsWith("draw ") ||
      lower.includes("generate image of");

    const isImageEditIntent =
      modelPreference === "image-edit" ||
      (pendingImage &&
        (lower.includes("edit") ||
          lower.includes("remove") ||
          lower.includes("change") ||
          lower.includes("replace") ||
          lower.includes("make it")));

    const isDocumentIntent =
      lower.includes("write a") &&
      (lower.includes("document") ||
        lower.includes("proposal") ||
        lower.includes("report") ||
        lower.includes("pdf") ||
        lower.includes("docx"));

    const userMsg: Message = {
      id: generateId(),
      role: "user",
      content: text || (pendingImage ? "Analyze this image" : ""),
      image_url: pendingImage || undefined,
    };
    addMessage(userMsg);
    await persistUserMessage(sessionId, userMsg);

    if (isImageGenIntent && !pendingImage) {
      await handleImageGen(text, sessionId);
      return;
    }

    if (isImageEditIntent && (pendingImage || editingImageUrl)) {
      await handleImageEdit(
        text || "Improve this image",
        pendingImage || editingImageUrl!,
        sessionId
      );
      return;
    }

    if (isDocumentIntent) {
      await handleDocumentGen(text, sessionId);
      return;
    }

    // Default text / vision
    const apiMessages = [
      ...messages.map((m) => ({ role: m.role, content: m.content })),
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

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No stream");

      const decoder = new TextDecoder();
      let full = "";
      while (true) {
        const { done, value: chunk } = await reader.read();
        if (done) break;
        const textChunk = decoder.decode(chunk);
        const lines = textChunk.split("\n").filter((l) => l.trim());
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) {
                full += data.content;
                updateLastMessage(full);
              }
            } catch {}
          }
        }
      }
    } catch (err) {
      console.error(err);
      updateLastMessage("Sorry, something went wrong. Please try again.");
    } finally {
      setIsStreaming(false);
      setPendingImage(null);
      setEditingImageUrl(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl">
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
            className="max-h-40 flex-1 resize-none bg-transparent py-2.5 text-[15px] outline-none placeholder:text-muted-foreground"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
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
              disabled={
                (!value.trim() && !pendingImage) ||
                useAppStore.getState().isStreaming
              }
              className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground transition disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
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
