import { createClient } from "@/lib/supabase/server";
import { NextRequest } from "next/server";

export const runtime = "edge";

const GROQ_API_KEY = process.env.GROQ_API_KEY!;
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      messages,
      modelPreference = "auto",
      sessionId,
      imageBase64,
    } = body;

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "Messages required" }), {
        status: 400,
      });
    }

    // Determine which Groq model to use
    let model = "openai/gpt-oss-120b"; // default text
    let finalMessages = [...messages];

    // Auto routing or forced vision
    const hasImage =
      imageBase64 ||
      messages.some(
        (m: any) =>
          m.image_url ||
          (Array.isArray(m.content) &&
            m.content.some((c: any) => c.type === "image_url"))
      );

    if (modelPreference === "vision" || (modelPreference === "auto" && hasImage)) {
      model = "qwen/qwen3.8-27b";
    }

    // If image is provided as base64, convert last user message to multimodal
    if (imageBase64 && finalMessages.length > 0) {
      const last = finalMessages[finalMessages.length - 1];
      if (last.role === "user") {
        finalMessages[finalMessages.length - 1] = {
          role: "user",
          content: [
            {
              type: "text",
              text: last.content || "Describe this image in detail.",
            },
            {
              type: "image_url",
              image_url: {
                url: imageBase64.startsWith("data:")
                  ? imageBase64
                  : `data:image/jpeg;base64,${imageBase64}`,
              },
            },
          ],
        };
      }
    }

    // Call Groq
    const response = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: finalMessages,
        stream: true,
        temperature: 0.7,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Groq error:", err);
      return new Response(
        JSON.stringify({ error: "Failed to reach AI model", details: err }),
        { status: 500 }
      );
    }

    // Stream the response back
    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }

        const decoder = new TextDecoder();
        let fullContent = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split("\n").filter((line) => line.trim() !== "");

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const data = line.slice(6);
                if (data === "[DONE]") continue;

                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices?.[0]?.delta?.content || "";
                  if (content) {
                    fullContent += content;
                    controller.enqueue(
                      new TextEncoder().encode(
                        `data: ${JSON.stringify({ content })}\n\n`
                      )
                    );
                  }
                } catch {
                  // skip invalid json
                }
              }
            }
          }

          // Optionally persist the assistant message if logged in + sessionId
          if (sessionId && fullContent) {
            try {
              const supabase = await createClient();
              const {
                data: { user },
              } = await supabase.auth.getUser();

              if (user) {
                await supabase.from("messages").insert({
                  session_id: sessionId,
                  role: "assistant",
                  content: fullContent,
                  model_used: model,
                });

                // Update session title if it is still "New Chat"
                const { data: session } = await supabase
                  .from("chat_sessions")
                  .select("title")
                  .eq("id", sessionId)
                  .single();

                if (session?.title === "New Chat") {
                  const title =
                    messages
                      .find((m: any) => m.role === "user")
                      ?.content?.slice(0, 60) || "New Chat";
                  await supabase
                    .from("chat_sessions")
                    .update({ title })
                    .eq("id", sessionId);
                }
              }
            } catch (e) {
              console.error("Failed to persist message:", e);
            }
          }

          controller.enqueue(
            new TextEncoder().encode(`data: ${JSON.stringify({ done: true, model })}\n\n`)
          );
        } catch (e) {
          console.error("Stream error:", e);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error: any) {
    console.error("Chat API error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal error" }),
      { status: 500 }
    );
  }
}
