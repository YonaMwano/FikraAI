import { NextRequest, NextResponse } from "next/server";
import Client from "magic-hour";

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
    const aspectRatio = body.aspectRatio || "16:9";
    const name = body.name || `Fikra-${Date.now()}`;

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    const client = new Client({ token: apiKey });

    // Use the official SDK with waitForCompletion so we get the final image
    const res = await client.v1.aiImageGenerator.generate(
      {
        aspectRatio,
        imageCount: 1,
        model: "z-image-turbo",
        name,
        resolution: "640px",
        style: {
          prompt,
          tool: "general",
        },
      },
      {
        waitForCompletion: true,
        // We don't need to download to disk on the server
        downloadOutputs: false,
      }
    );

    const imageUrl = res.downloads?.[0]?.url ?? null;

    if (!imageUrl) {
      console.error("MagicHour response (no URL found):", JSON.stringify(res, null, 2));
      return NextResponse.json(
        {
          status: "processing",
          message: "Image generation finished but no downloadable URL was returned.",
          raw: res,
        },
        { status: 200 }
      );
    }

    return NextResponse.json({
      status: "completed",
      imageUrl,
      model: "z-image-turbo",
    });
  } catch (error: any) {
    console.error("Image generate error:", error);
    return NextResponse.json(
      {
        error: error?.message || "Image generation failed",
        details: String(error).slice(0, 400),
      },
      { status: 500 }
    );
  }
}
