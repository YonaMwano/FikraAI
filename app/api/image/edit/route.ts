import { NextRequest, NextResponse } from "next/server";
import Client from "magic-hour";
import { createHmac, timingSafeEqual } from "node:crypto";
import { imageEditInput } from "@/lib/image-edit";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.MAGIC_HOUR_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "MAGIC_HOUR_API_KEY is not configured" },
        { status: 500 }
      );
    }

    const body = await req.json();
    const prompt = body.prompt;
    const imageUrl = body.imageUrl;
    const name = body.name || `Fikra-Edit-${Date.now()}`;

    if (typeof prompt !== "string" || !prompt.trim() || typeof imageUrl !== "string" || !imageUrl) {
      return NextResponse.json(
        { error: "Both prompt and imageUrl are required" },
        { status: 400 }
      );
    }

    let input: string | File;
    try {
      input = imageEditInput(imageUrl);
    } catch {
      return NextResponse.json({ error: "Use a PNG, JPEG, or WebP image under 10 MB, or an HTTPS image URL." }, { status: 400 });
    }
    const client = new Client({ token: apiKey });
    // Uploaded browser images are data URLs, not filesystem paths.
    const source = await client.v1.files.uploadFile(input);

    const project = await client.v1.aiImageEditor.create({
      assets: { imageFilePaths: [source] },
      name,
      model: "qwen-image-2.1",
      resolution: "640px",
      style: { prompt },
    });
    // Return before the provider queue can exceed the function request timeout.
    const expires = Date.now() + 30 * 60 * 1000;
    const payload = `${project.id}.${expires}`;
    const signature = createHmac("sha256", apiKey).update(payload).digest("hex");
    return NextResponse.json({ status: "processing", job: `${payload}.${signature}` });
  } catch {
    return NextResponse.json(
      { error: "Image editing failed. Please try again." },
      { status: 502 }
    );
  }
}

export async function GET(req: NextRequest) {
  const apiKey = process.env.MAGIC_HOUR_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Image editing is unavailable." }, { status: 503 });
  const job = req.nextUrl.searchParams.get("job") || "";
  const match = /^([a-zA-Z0-9_-]+)\.(\d{13})\.([a-f0-9]{64})$/.exec(job);
  if (!match) return NextResponse.json({ error: "Invalid image edit job." }, { status: 400 });
  const [, id, expires, signature] = match;
  const expected = createHmac("sha256", apiKey).update(`${id}.${expires}`).digest();
  if (Number(expires) < Date.now() || !timingSafeEqual(expected, Buffer.from(signature, "hex"))) {
    return NextResponse.json({ error: "This image edit job has expired. Please submit the edit again." }, { status: 403 });
  }
  try {
    const client = new Client({ token: apiKey });
    const result = await client.v1.imageProjects.get({ id });
    if (result.status === "error" || result.status === "canceled") {
      return NextResponse.json({ error: "The image provider could not finish this edit. Please try another image or description." }, { status: 502 });
    }
    if (result.status === "complete") {
      const imageUrl = result.downloads?.[0]?.url;
      if (!imageUrl) return NextResponse.json({ error: "No edited image was returned." }, { status: 502 });
      return NextResponse.json({ status: "completed", imageUrl, model: "qwen-image-2.1" }, { headers: { "Cache-Control": "no-store" } });
    }
    return NextResponse.json({ status: "processing" }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Unable to check this edit. Please try again." }, { status: 503 });
  }
}
