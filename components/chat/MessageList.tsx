"use client";

import { useAppStore } from "@/lib/store";
import { User, Bot, Copy, Check, Pencil } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { GeneratedImage } from "./GeneratedImage";
import { DocumentCard } from "./DocumentCard";
import { Markdown } from "./Markdown";
import { ImageGenerating } from "./ImageGenerating";


interface MessageListProps {
  user: any;
  onEditImage?: (url: string) => void;
  onRegenerateImage?: (prompt: string) => void;
}

export function MessageList({
  user,
  onEditImage,
  onRegenerateImage,
}: MessageListProps) {
  const { messages, isStreaming } = useAppStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const followRef = useRef(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (followRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isStreaming]);

  const handleCopy = async (id: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (e) {
      console.error("Copy failed", e);
    }
  };

  const handleEditMessage = (id: string, content: string, imageUrl?: string | null) => {
    // Put the text back into the input so user can edit and resend
    const event = new CustomEvent("fikra-edit-message", { detail: { id, content, imageUrl } });
    window.dispatchEvent(event);
  };

  if (messages.length === 0) return null;

  return (
    <div ref={scrollRef} role="log" aria-label="Conversation" onScroll={() => {
      const el = scrollRef.current;
      if (el) followRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    }} className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain px-3 py-6 sm:px-4">
      <div className="mx-auto max-w-3xl space-y-6">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`group flex min-w-0 gap-2 sm:gap-3 ${
              msg.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            {msg.role === "assistant" && (
              <div className="mt-1 hidden h-8 w-8 shrink-0 sm:flex items-center justify-center rounded-full bg-primary/10">
                <Bot className="h-4 w-4 text-primary" />
              </div>
            )}

            <div
              className={`relative min-w-0 rounded-2xl px-3 py-3 sm:px-4 [overflow-wrap:anywhere] text-[15px] leading-relaxed ${
                msg.role === "user"
                  ? "max-w-[85%] bg-primary text-primary-foreground"
                  : "w-full max-w-full bg-muted sm:max-w-[90%]"
              }`}
            >
              {/* User uploaded image */}
              {msg.image_url && msg.role === "user" && (
                <img
                  src={msg.image_url}
                  alt="Uploaded"
                  className="mb-3 max-h-64 rounded-xl object-cover"
                />
              )}

              {/* Image generating placeholder */}
              {msg.role === "assistant" &&
                (msg.content === "Generating your image…" ||
                  msg.content === "Editing your image…") && (
                  <ImageGenerating prompt={msg.content} />
                )}

              {/* Text content with Markdown */}
              {msg.content &&
                msg.role === "assistant" &&
                msg.content !== "Generating your image…" &&
                msg.content !== "Editing your image…" && (
                  <Markdown content={msg.content} />
                )}
              {msg.content && msg.role === "user" && (
                <div className="whitespace-pre-wrap">{msg.content}</div>
              )}

              {/* Generated / Edited image */}
              {msg.image_url && msg.role === "assistant" && (
                <GeneratedImage
                  imageUrl={msg.image_url}
                  originalUrl={(msg as any).original_url}
                  prompt={msg.content}
                  model={msg.model_used || undefined}
                  user={user}
                  onEdit={onEditImage}
                  onRegenerate={
                    onRegenerateImage
                      ? () => onRegenerateImage(msg.content)
                      : undefined
                  }
                />
              )}

              {/* Document card */}
              {msg.document_name && (
                <DocumentCard
                  name={msg.document_name}
                  url={msg.document_url || undefined}
                  content={msg.content}
                  user={user}
                />
              )}

              {msg.model_used && msg.role === "assistant" && !msg.image_url && (
                <p className="mt-2 text-xs opacity-50">via {msg.model_used}</p>
              )}

              {msg.role === "user" && msg.content && (
                <div className="mt-2 flex justify-end">
                  <button
                    onClick={() => handleEditMessage(msg.id, msg.content, msg.image_url)}
                    className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-primary-foreground/80 hover:bg-background/50 hover:text-foreground"
                    disabled={isStreaming} title="Edit & resend"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </button>
                </div>
              )}

              {/* Copy assistant response */}
              {msg.role === "assistant" && msg.content && !msg.image_url && (
                <div className="mt-2 flex items-center gap-1 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                  <button
                    onClick={() => handleCopy(msg.id, msg.content)}
                    className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-background/50 hover:text-foreground"
                    title="Copy"
                  >
                    {copiedId === msg.id ? (
                      <Check className="h-3.5 w-3.5 text-green-500" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    {copiedId === msg.id ? "Copied" : "Copy"}
                  </button>

                </div>
              )}
            </div>

            {msg.role === "user" && (
              <div className="mt-1 hidden h-8 w-8 shrink-0 sm:flex items-center justify-center rounded-full bg-muted">
                <User className="h-4 w-4" />
              </div>
            )}
          </div>
        ))}

        {/* Streaming indicator */}
        {isStreaming && (
          <div className="flex gap-3">
            <div className="mt-1 hidden h-8 w-8 shrink-0 sm:flex items-center justify-center rounded-full bg-primary/10">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <div className="rounded-2xl bg-muted px-4 py-3">
              <div className="flex gap-1.5">
                <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:-0.3s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:-0.15s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50" />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
