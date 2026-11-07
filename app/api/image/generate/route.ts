import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAGIC_HOUR_API_KEY = process.env.MAGIC_HOUR_API_KEY;

export async function POST(req: NextRequest) {
  try {
    if (!MAGIC_HOUR_API_KEY) {
      return NextResponse.json(
        { error: "MAGIC_HOUR_API_KEY is not configured" },
        { status: 500 }
      );
    }

    const { prompt, aspectRatio = "16:9", name = "Fikra AI Image" } =
      await req.json();

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    // Create the image generation job
    const createRes = await fetch(
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

    const createData = await createRes.json();

    if (!createRes.ok) {
      console.error("MagicHour create error:", createData);
      return NextResponse.json(
        {
          error: "Image generation failed",
          details: createData?.message || createData?.error || JSON.stringify(createData).slice(0, 300),
        },
        { status: 500 }
      );
    }

    // Try to extract a direct URL if the API returns one immediately
    let imageUrl: string | null = null;

    if (createData?.downloads?.[0]?.url) {
      imageUrl = createData.downloads[0].url;
    } else if (createData?.images?.[0]?.url) {
      imageUrl = createData.images[0].url;
    } else if (Array.isArray(createData?.output) && createData.output[0]) {
      imageUrl = createData.output[0];
    } else if (createData?.url) {
      imageUrl = createData.url;
    }

    if (imageUrl) {
      return NextResponse.json({
        status: "completed",
        imageUrl,
        model: "z-image-turbo",
      });
    }

    // If we only got a job/project id, return processing so the UI can show the generating state
    const jobId = createData?.id || createData?.project_id || createData?.job_id;

    return NextResponse.json({
      status: "processing",
      jobId,
      message:
        "Image is being generated. MagicHour returned a job ID. For production, add polling or use their SDK with waitForCompletion.",
      raw: createData,
    });
  } catch (error: any) {
    console.error("Image generate route error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
