import { exec } from "child_process";
import { NextResponse, type NextRequest } from "next/server";

export async function POST(req: NextRequest): Promise<Response> {
  const { url } = await req.json();
  if (!url) return NextResponse.json({ error: "No URL provided" }, { status: 400 });

  return new Promise((resolve) => {
    exec(
      `yt-dlp -F "${url}"`,
      { timeout: 30000, maxBuffer: 10 * 1024 * 1024 },
      (err, stdout, stderr) => {
        if (err) {
          console.error("[yt-dlp formats error]", {
            code: err.code,
            message: err.message,
            stderr,
          });

          // Check if yt-dlp is not found
          if (err.code === 127 || err.message.includes("not found") || err.message.includes("ENOENT")) {
            return resolve(
              NextResponse.json(
                {
                  error: "yt-dlp is not installed on this server. Please install it to use this feature.",
                  details: "yt-dlp command not found",
                },
                { status: 503 }
              )
            );
          }

          return resolve(
            NextResponse.json(
              {
                error: stderr || err.message || "Failed to fetch formats",
                code: err.code,
              },
              { status: 500 }
            )
          );
        }

        if (!stdout) {
          return resolve(
            NextResponse.json(
              { error: "No formats returned. The URL might be invalid." },
              { status: 400 }
            )
          );
        }

        resolve(NextResponse.json({ formats: stdout }));
      }
    );
  });
}