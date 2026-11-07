export type ModelPreference = "auto" | "vision" | "image-gen" | "image-edit";

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  image_url?: string | null;
  original_url?: string | null;
  document_url?: string | null;
  document_name?: string | null;
  model_used?: string | null;
  created_at?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  model_preference: ModelPreference;
  is_guest: boolean;
  created_at: string;
  updated_at: string;
  messages?: Message[];
}
