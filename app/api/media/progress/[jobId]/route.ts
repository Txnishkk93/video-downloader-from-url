import { NextRequest, NextResponse } from "next/server";
import { jobStore } from "@/lib/server/jobStore";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await params;
  const job = jobStore.getJob(jobId);

  if (!job) {
    console.error("Job not found:", jobId, "Available jobs:", jobStore.getAllJobIds());
    return NextResponse.json({ success: false, error: "Job not found" }, { status: 404 });
  }

  if (job.status === "completed") {
    const fileUrl = `/api/media/file/${jobId}`;
    return NextResponse.json({
      success: true,
      status: "completed",
      progress: 100,
      file_url: fileUrl,
    });
  }

  if (job.status === "error") {
    return NextResponse.json({
      success: false,
      status: "error",
      progress: job.progress,
      error: job.error || "Unknown error",
    });
  }

  return NextResponse.json({
    success: true,
    status: job.status,
    progress: job.progress,
  });
}

