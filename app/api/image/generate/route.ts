import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAGIC_HOUR_API_KEY = process.env.MAGIC_HOUR_API_KEY!;

export async function POST(req: NextRequest) {
  try {
    const { prompt, aspectRatio = "16:9", name = "Fikra AI Image" } =
      await req.json();

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    // MagicHour AI Image Generator
    const response = await fetch(
      "https://api.magichour.ai/v1/ai-image-generator",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${MAGIC_HOUR_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          aspect_ratio: aspectRatio,
          image_count: 1,
          model: "z-image-turbo",
          name,
          resolution: "640px",
          style: {
            prompt,
            tool: "general",
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("MagicHour generate error:", errText);
      return NextResponse.json(
        { error: "Image generation failed", details: errText },
        { status: 500 }
      );
    }

    const data = await response.json();

    // MagicHour returns a project / job. We poll if needed.
    // For simplicity we assume the response contains downloadable urls
    // or we return the job id so client can poll.
    // Many MagicHour endpoints support waitForCompletion style via their SDK,
    // but raw HTTP usually returns a project object.

    // Try to extract image URL(s)
    let imageUrl: string | null = null;

    if (data?.downloads?.[0]?.url) {
      imageUrl = data.downloads[0].url;
    } else if (data?.images?.[0]?.url) {
      imageUrl = data.images[0].url;
    } else if (data?.output?.[0]) {
      imageUrl = data.output[0];
    } else if (data?.id) {
      // Return job id for polling
      return NextResponse.json({
        status: "processing",
        jobId: data.id,
        message: "Image is being generated. Please wait...",
      });
    }

    if (!imageUrl) {
      // Fallback: return the whole response so we can debug
      return NextResponse.json({
        status: "unknown",
        raw: data,
        message: "Generation started but no direct URL returned yet.",
      });
    }

    return NextResponse.json({
      status: "completed",
      imageUrl,
      model: "z-image-turbo",
    });
  } catch (error: any) {
    console.error("Image generate route error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
