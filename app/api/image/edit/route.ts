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

    const { prompt, imageUrl, name = "Fikra AI Image Edit" } = await req.json();

    if (!prompt || !imageUrl) {
      return NextResponse.json(
        { error: "Both prompt and imageUrl are required" },
        { status: 400 }
      );
    }

    const createRes = await fetch(
      "https://api.magichour.ai/v1/ai-image-editor",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${MAGIC_HOUR_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          assets: {
            // MagicHour accepts either file paths or publicly accessible URLs
            image_file_paths: [imageUrl],
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

    const createData = await createRes.json();

    if (!createRes.ok) {
      console.error("MagicHour edit error:", createData);
      return NextResponse.json(
        {
          error: "Image edit failed",
          details: createData?.message || createData?.error || JSON.stringify(createData).slice(0, 300),
        },
        { status: 500 }
      );
    }

    let editedUrl: string | null = null;

    if (createData?.downloads?.[0]?.url) {
      editedUrl = createData.downloads[0].url;
    } else if (createData?.images?.[0]?.url) {
      editedUrl = createData.images[0].url;
    } else if (Array.isArray(createData?.output) && createData.output[0]) {
      editedUrl = createData.output[0];
    } else if (createData?.url) {
      editedUrl = createData.url;
    }

    if (editedUrl) {
      return NextResponse.json({
        status: "completed",
        imageUrl: editedUrl,
        originalUrl: imageUrl,
        model: "qwen-image-2.1",
      });
    }

    const jobId = createData?.id || createData?.project_id || createData?.job_id;

    return NextResponse.json({
      status: "processing",
      jobId,
      message: "Image edit is processing. Add polling for production use.",
      raw: createData,
    });
  } catch (error: any) {
    console.error("Image edit route error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
