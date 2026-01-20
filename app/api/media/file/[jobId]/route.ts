import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { DOWNLOAD_DIR } from "../../download/route";
import { jobStore } from "@/lib/server/jobStore";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await params;
  const job = jobStore.getJob(jobId);

  if (!job || !job.file) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const filePath = path.join(DOWNLOAD_DIR, job.file);

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const stat = fs.statSync(filePath);
  const fileStream = fs.createReadStream(filePath);

  const response = new NextResponse(fileStream as any, {
    status: 200,
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Length": stat.size.toString(),
      "Content-Disposition": `attachment; filename="${job.file}"`,
    },
  });

  return response;
}

