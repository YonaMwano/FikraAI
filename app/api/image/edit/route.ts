import { NextRequest, NextResponse } from "next/server";
import { Client } from "magic-hour";

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

    if (!prompt || !imageUrl) {
      return NextResponse.json(
        { error: "Both prompt and imageUrl are required" },
        { status: 400 }
      );
    }

    const client = new Client({ token: apiKey });

    const res = await client.v1.aiImageEditor.generate(
      {
        assets: {
          imageFilePaths: [imageUrl],
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

    let editedUrl: string | null = null;

    if (res?.downloads?.[0]?.url) {
      editedUrl = res.downloads[0].url;
    } else if (res?.images?.[0]?.url) {
      editedUrl = res.images[0].url;
    } else if (Array.isArray(res?.output) && res.output[0]) {
      editedUrl = typeof res.output[0] === "string" ? res.output[0] : res.output[0].url;
    } else if (res?.url) {
      editedUrl = res.url;
    } else if (res?.data?.downloads?.[0]?.url) {
      editedUrl = res.data.downloads[0].url;
    } else if (res?.data?.images?.[0]?.url) {
      editedUrl = res.data.images[0].url;
    }

    if (!editedUrl) {
      console.error("MagicHour edit response (no URL found):", JSON.stringify(res, null, 2));
      return NextResponse.json(
        {
          status: "processing",
          message: "Image edit finished but no downloadable URL was returned.",
          raw: res,
        },
        { status: 200 }
      );
    }

    return NextResponse.json({
      status: "completed",
      imageUrl: editedUrl,
      originalUrl: imageUrl,
      model: "qwen-image-2.1",
    });
  } catch (error: any) {
    console.error("Image edit error:", error);
    return NextResponse.json(
      {
        error: error?.message || "Image edit failed",
        details: String(error).slice(0, 400),
      },
      { status: 500 }
    );
  }
}
