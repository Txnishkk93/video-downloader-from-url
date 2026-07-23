import { NextResponse, type NextRequest } from "next/server";
import youtubedl from "youtube-dl-exec";

export async function POST(req: NextRequest): Promise<Response> {
  const { url } = await req.json();
  if (!url) return NextResponse.json({ error: "No URL provided" }, { status: 400 });

  try {
    const subprocess = youtubedl.exec(url, {
      listFormats: true,
      noWarnings: true,
      noCallHome: true,
      noCheckCertificates: true,
    });
    
    const { stdout } = await subprocess;
    return NextResponse.json({ formats: stdout });
  } catch (error: any) {
    console.error("[youtube-dl-exec formats error]", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch formats", details: error.toString() },
      { status: 500 }
    );
  }
}
