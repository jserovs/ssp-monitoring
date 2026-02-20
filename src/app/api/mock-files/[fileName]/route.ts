import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

interface RouteContext {
  params: Promise<{
    fileName: string;
  }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const params = await context.params;
  const fileName = path.basename(params.fileName || "");

  if (!fileName.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json({ error: "Only PDF files are supported" }, { status: 400 });
  }

  const filePath = path.join(process.cwd(), "mock-files", fileName);

  try {
    const bytes = await readFile(filePath);
    return new NextResponse(bytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
