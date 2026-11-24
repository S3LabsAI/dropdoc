import { NextRequest, NextResponse } from "next/server";
import { deleteReport } from "@/lib/store";
import { refuseWrite } from "@/lib/upload-access";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const refusal = refuseWrite(request);
  if (refusal) return refusal;

  const { slug } = await params;
  const deleted = await deleteReport(slug);

  if (!deleted) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
