export type ChatIntent = { action: "chat" | "image-generate" | "image-edit" | "document"; format: "pdf" | "docx" | "xlsx"; prompt?: string };
export function detectIntent(text: string, hasImage = false): ChatIntent {
  const format = /\b(excel|excell|xlsx|spreadsheet|workbook)\b/i.test(text) ? "xlsx" : /\b(word|docx)\b/i.test(text) ? "docx" : "pdf";
  if (/^(how|what|why|when|where|can you explain|explain|tell me about)\b/i.test(text.trim())) return { action: "chat", format };
  const wantsCreation = /\b(generate|create|make|write|prepare|draft|build|draw|design|export|download|give me)\b/i.test(text);
  if (wantsCreation && /\b(document|pdf|word|docx|excel|excell|xlsx|spreadsheet|workbook|proposal|report)\b/i.test(text)) return { action: "document", format };
  if (hasImage && /\b(edit|remove|replace|change|improve|transform)\b|make it/i.test(text)) return { action: "image-edit", format };
  if (wantsCreation && (/\b(image|picture|photo|illustration|artwork|logo|portrait)\b/i.test(text) || /\b(draw|paint)\b/i.test(text))) return { action: "image-generate", format };
  return { action: "chat", format };
}
