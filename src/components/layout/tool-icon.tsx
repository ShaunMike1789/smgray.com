import {
  AudioLines,
  FolderCog,
  ListMusic,
  ScanText,
  Crop,
  type LucideProps,
} from "lucide-react";

import type { ToolIcon } from "@/lib/tools";

const iconMap = {
  audio: AudioLines,
  cleanup: ScanText,
  crop: Crop,
  folder: FolderCog,
  playlist: ListMusic,
} satisfies Record<ToolIcon, React.ComponentType<LucideProps>>;

interface ToolIconProps extends LucideProps {
  icon: ToolIcon;
}

export function ToolIcon({ icon, ...props }: ToolIconProps) {
  const Icon = iconMap[icon];
  return <Icon {...props} />;
}
