import { ToolShell } from "@/components/layout/tool-shell";

export default function ToolsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <ToolShell>{children}</ToolShell>;
}

