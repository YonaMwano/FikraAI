# Fikra AI

Intelligent multi-model AI assistant built with **Next.js 15**, **Supabase**, **Groq** & **MagicHour**.

Clean, minimalist, ChatGPT-style interface with dark mode, Google authentication, and smart model routing.

## Features

- Clean ChatGPT-style UI (mobile-first + collapsible desktop sidebar)
- Google Authentication via Supabase
- Guest mode with Auth Gate for uploads & downloads
- Model switcher: **Fikra Auto / Vision / Image Gen / Image Edit**
- Full dark mode (system / light / dark)
- Real-time streaming chat with Groq
- Vision support (upload image + ask questions)
- **Image Generation** (MagicHour `z-image-turbo`)
- **Image Editing** (MagicHour `qwen-image-2.1`) with Before/After slider
- Document generation + download gate
- Chat history stored in PostgreSQL (logged-in users)
- Online Lucide icons (no emojis)
- No Upgrade / premium buttons

## Tech Stack

- **Framework**: Next.js 15 (App Router) + TypeScript
- **Styling**: Tailwind CSS + next-themes
- **Auth & DB**: Supabase (Google OAuth + PostgreSQL + RLS)
- **State**: Zustand
- **Icons**: Lucide React
- **AI**:
  - Groq → `openai/gpt-oss-120b` (text) + `qwen/qwen3.8-27b` (vision)
  - MagicHour → `z-image-turbo` (gen) + `qwen-image-2.1` (edit)

## Getting Started

### 1. Clone & Install

```bash
git clone <your-repo>
cd fikra-ai
npm install
```

### 2. Environment Variables

```bash
cp .env.local.example .env.local
```



### 3. Database Schema

Go to Supabase → **SQL Editor** and run the entire content of `schema.sql`.

### 4. Google Auth Setup

In Supabase Dashboard → Authentication → Providers → Google:

- Enable Google
- Add your Google Client ID & Secret
- Add redirect URLs:
  
### 5. Run

```bash
npm run dev
```

Open 
## Model Routing

| Preference     | Behavior                                      |
|----------------|-----------------------------------------------|
| **Fikra Auto** | Text → `openai/gpt-oss-120b`<br>Image present → `qwen/qwen3.8-27b`<br>Image gen keywords → MagicHour |
| **Vision**     | Always `qwen/qwen3.8-27b`                     |
| **Image Gen**  | MagicHour `z-image-turbo`                     |
| **Image Edit** | MagicHour `qwen-image-2.1`                    |

## How to use Image features

1. Switch model to **Image Gen** or type “Generate an image of …”
2. For editing: generate or upload an image → click **Edit** → describe changes
3. Download requires Google login (Auth Gate)

## Deployment (Vercel)

1. Push to GitHub
2. Import in Vercel
3. Add the four environment variables
4. Deploy

---

Built for a clean, professional experience.
