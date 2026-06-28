import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AutoCropTool } from "@/components/auto-crop/auto-crop-tool";
import { AudioSplitterTool } from "@/components/audio/audio-splitter-tool";
import { ContentsTxtTool } from "@/components/filesystem/contents-txt-tool";
import { PlaylistCreatorTool } from "@/components/filesystem/playlist-creator-tool";
import { ComingSoonPanel } from "@/components/layout/coming-soon-panel";
import { TorrentSearchTool } from "@/components/search/torrent-search-tool";
import { ToolReadinessNotice } from "@/components/tools/browser-notice";
import { ContentCleanupTool } from "@/components/text/content-cleanup-tool";
import { getToolBySlug, toolRegistry } from "@/lib/tools";

export function generateStaticParams() {
  return toolRegistry.map((tool) => ({ toolSlug: tool.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ toolSlug: string }>;
}): Promise<Metadata> {
  const { toolSlug } = await params;
  const tool = getToolBySlug(toolSlug);

  if (!tool) {
    return {};
  }

  return {
    title: `${tool.name} | SM Gray Tool Bench`,
    description: tool.description,
  };
}

export default async function ToolPage({
  params,
}: {
  params: Promise<{ toolSlug: string }>;
}) {
  const { toolSlug } = await params;
  const tool = getToolBySlug(toolSlug);

  if (!tool) {
    notFound();
  }

  const content = (() => {
    switch (tool.slug) {
      case "auto-crop":
        return <AutoCropTool />;
      case "content-cleanup":
        return <ContentCleanupTool />;
      case "contents-txt-creator":
        return <ContentsTxtTool />;
      case "playlist-creator":
        return <PlaylistCreatorTool />;
      case "audio-splitter":
        return <AudioSplitterTool />;
      case "torrent-search":
        return <TorrentSearchTool />;
      default:
        return null;
    }
  })();

  if (content) {
    return (
      <div className="space-y-6">
        <ToolReadinessNotice tool={tool} />
        {content}
      </div>
    );
  }

  return <ComingSoonPanel tool={tool} />;
}
