// SSE records may be split across network chunks, including inside UTF-8 characters.
export async function readChatStream(response: Response, onContent: (content: string) => void) {
  if (!response.ok || !response.body) throw new Error("Unable to get a response. Please try again.");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";
  const consume = (line: string) => {
    if (!line.startsWith("data:")) return;
    const value = line.slice(5).trim();
    if (!value || value === "[DONE]") return;
    const data = JSON.parse(value);
    if (data.error) throw new Error(data.error);
    if (data.content) { full += data.content; onContent(full); }
  };
  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) consume(line);
      if (done) { if (buffer.trim()) consume(buffer); break; }
    }
  } finally { reader.releaseLock(); }
  if (!full.trim()) throw new Error("The model returned an empty response.");
  return full;
}
