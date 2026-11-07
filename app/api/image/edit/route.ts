import { NextRequest, NextResponse } from "next/server";
import Client from "magic-hour";
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

    const res = await client.v1.aiImageEditor.generate(
      {
        assets: {
          imageFilePaths: [source],
        },
        name,
        model: "qwen-image-2.1",
        resolution: "640px",
        style: {
          prompt,
        },
      },
      {
        waitForCompletion: true,
        downloadOutputs: false,
      }
    );

    const editedUrl = res.downloads?.[0]?.url ?? null;

    if (!editedUrl) {
      return NextResponse.json(
        { error: "The image provider did not return an edited image. Please try again." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      status: "completed",
      imageUrl: editedUrl,
      originalUrl: imageUrl,
      model: "qwen-image-2.1",
    });
  } catch {
    return NextResponse.json(
      { error: "Image editing failed. Please try again." },
      { status: 502 }
    );
  }
}
