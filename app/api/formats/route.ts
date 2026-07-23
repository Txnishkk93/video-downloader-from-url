import { exec } from "child_process";
import { NextResponse, type NextRequest } from "next/server";

export async function POST(req: NextRequest): Promise<Response> {
  const { url } = await req.json();
  if (!url) return NextResponse.json({ error: "No URL provided" }, { status: 400 });

  return new Promise((resolve) => {
    exec(`yt-dlp -F "${url}"`, (err, stdout, stderr) => {
      if (err) {
        resolve(NextResponse.json({ error: stderr }, { status: 500 }));
        return;
      }
      resolve(NextResponse.json({ formats: stdout }));
    });
  });
}