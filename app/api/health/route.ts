import { NextResponse } from "next/server";
import { jobStore } from "@/lib/server/jobStore";

export async function GET() {
  return NextResponse.json({ status: "ok", jobs: jobStore.getAllJobIds().length });
}