import { NextResponse, type NextRequest } from "next/server";
import youtubedl from "youtube-dl-exec";
import path from "path";
import os from "os";

const isWin = os.platform() === "win32";
const binaryName = isWin ? "yt-dlp.exe" : "yt-dlp";
const binaryPath = path.join(process.cwd(), "node_modules", "youtube-dl-exec", "bin", binaryName);
const ytdl = youtubedl.create(binaryPath);

export async function POST(req: NextRequest): Promise<Response> {
  const { url } = await req.json();
  if (!url) return NextResponse.json({ error: "No URL provided" }, { status: 400 });

  try {
    const subprocess = ytdl.exec(url, {
      listFormats: true,
      noWarnings: true,
      callHome: false,
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
