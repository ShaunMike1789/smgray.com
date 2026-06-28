import { NextResponse } from "next/server";

import { getToolBySlug } from "@/lib/tools";

export async function GET(
  _request: Request,
  context: { params: Promise<{ toolSlug: string }> },
) {
  const { toolSlug } = await context.params;
  const tool = getToolBySlug(toolSlug);

  if (!tool) {
    return NextResponse.json(
      { error: `Unknown tool: ${toolSlug}` },
      { status: 404 },
    );
  }

  return NextResponse.json({
    browserSupport: tool.browserSupport,
    executionMode: tool.executionMode,
    id: tool.id,
    name: tool.name,
    requiresFileSystemAccess: tool.requiresFileSystemAccess,
    requiresLocalHelper: tool.requiresLocalHelper,
    route: tool.route,
    status: tool.status,
    message:
      tool.status === "live"
        ? "This tool route is active and carries its own browser or local-helper execution requirements."
        : "This route is reserved for a future tool implementation.",
  });
}
