import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAGIC_HOUR_API_KEY = process.env.MAGIC_HOUR_API_KEY!;

export async function POST(req: NextRequest) {
  try {
    const { prompt, imageUrl, name = "Fikra AI Image Edit" } = await req.json();

    if (!prompt || !imageUrl) {
      return NextResponse.json(
        { error: "Both prompt and imageUrl are required" },
        { status: 400 }
      );
    }

    // MagicHour AI Image Editor
    const response = await fetch(
      "https://api.magichour.ai/v1/ai-image-editor",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${MAGIC_HOUR_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          assets: {
            image_file_paths: [imageUrl], // or image urls depending on API
          },
          name,
          model: "qwen-image-2.1",
          resolution: "640px",
          style: {
            prompt,
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("MagicHour edit error:", errText);
      return NextResponse.json(
        { error: "Image edit failed", details: errText },
        { status: 500 }
      );
    }

    const data = await response.json();

    let editedUrl: string | null = null;

    if (data?.downloads?.[0]?.url) {
      editedUrl = data.downloads[0].url;
    } else if (data?.images?.[0]?.url) {
      editedUrl = data.images[0].url;
    } else if (data?.output?.[0]) {
      editedUrl = data.output[0];
    } else if (data?.id) {
      return NextResponse.json({
        status: "processing",
        jobId: data.id,
        message: "Image is being edited. Please wait...",
      });
    }

    if (!editedUrl) {
      return NextResponse.json({
        status: "unknown",
        raw: data,
        message: "Edit started but no direct URL returned yet.",
      });
    }

    return NextResponse.json({
      status: "completed",
      imageUrl: editedUrl,
      originalUrl: imageUrl,
      model: "qwen-image-2.1",
    });
  } catch (error: any) {
    console.error("Image edit route error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
