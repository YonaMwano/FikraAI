"use client";

import { useAppStore } from "@/lib/store";
import { User, Bot } from "lucide-react";
import { useEffect, useRef } from "react";
import { GeneratedImage } from "./GeneratedImage";
import { DocumentCard } from "./DocumentCard";

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
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  if (messages.length === 0) return null;

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      <div className="mx-auto max-w-3xl space-y-6">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-4 ${
              msg.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            {msg.role === "assistant" && (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Bot className="h-4 w-4 text-primary" />
              </div>
            )}

            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-[15px] leading-relaxed ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              }`}
            >
              {msg.image_url && msg.role === "user" && (
                <img
                  src={msg.image_url}
                  alt="Uploaded"
                  className="mb-3 max-h-64 rounded-xl object-cover"
                />
              )}

              {msg.content && (
                <div className="whitespace-pre-wrap">{msg.content}</div>
              )}

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
            </div>

            {msg.role === "user" && (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                <User className="h-4 w-4" />
              </div>
            )}
          </div>
        ))}

        {isStreaming && (
          <div className="flex gap-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <div className="rounded-2xl bg-muted px-4 py-3">
              <div className="flex gap-1">
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
