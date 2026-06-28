"use client";

import { UserButton } from "@clerk/nextjs";
import { Menu, MonitorCog, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { ToolIcon } from "@/components/layout/tool-icon";
import { toolGroups } from "@/lib/tools";

interface ToolShellProps {
  children: React.ReactNode;
}

function NavigationContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const hasClerk = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-[18px] border border-white/12 bg-white/8">
            <MonitorCog size={24} />
          </div>
          <div>
            <p className="eyebrow text-white/55">SM Gray</p>
            <p className="display-title text-3xl text-white">Tool Bench</p>
          </div>
          {hasClerk ? (
            <div className="ml-auto">
              <UserButton />
            </div>
          ) : null}
        </div>

        <p className="max-w-xs text-sm leading-6 text-white/64">
          A compact workshop for the repeatable fixes you do every day, now
          spanning image, text, folder, and audio flows.
        </p>
      </div>

      <nav className="mt-8 flex-1 space-y-6">
        {Object.entries(toolGroups).map(([category, tools]) => (
          <div key={category} className="space-y-3">
            <p className="eyebrow text-white/40">{category}</p>

            <div className="space-y-2">
              {tools.map((tool) => {
                const isActive = pathname === tool.route;
                const isLive = tool.status === "live";

                return (
                  <Link
                    key={tool.id}
                    className={`block rounded-[24px] border px-4 py-4 transition duration-200 ${
                      isActive
                        ? "border-white/18 bg-white/12 text-white shadow-[0_12px_30px_rgba(0,0,0,0.18)]"
                        : "border-white/6 bg-white/[0.03] text-white/72 hover:border-white/12 hover:bg-white/[0.06]"
                    }`}
                    href={tool.route}
                    onClick={onNavigate}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-0.5 flex size-11 items-center justify-center rounded-[16px] border ${
                          isActive
                            ? "border-accent/30 bg-accent/18 text-white"
                            : "border-white/10 bg-white/[0.05] text-white/80"
                        }`}
                      >
                        <ToolIcon icon={tool.icon} size={20} strokeWidth={1.9} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-base font-semibold">{tool.name}</p>
                          <span
                            className={`rounded-full px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.28em] ${
                              isLive
                                ? "bg-signal/20 text-signal"
                                : "bg-white/8 text-white/45"
                            }`}
                          >
                            {isLive ? "Live" : "Soon"}
                          </span>
                        </div>

                        <p className="mt-1 text-sm leading-5 text-white/55">
                          {tool.description}
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="steel-inset rounded-[24px] p-4 text-sm leading-6 text-white/62">
        Chromium-first local tools and one Windows helper-backed audio bridge
        keep the bench close to your desktop workflow instead of forcing every
        task into upload/download loops.
      </div>
    </>
  );
}

export function ToolShell({ children }: ToolShellProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  return (
    <div className="px-4 py-4 md:px-6 lg:p-6">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-[1760px] gap-4 lg:gap-6">
        <aside className="panel-shell hidden w-[320px] rounded-[34px] p-5 text-white lg:flex lg:flex-col">
          <NavigationContent />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col gap-4 lg:gap-6">
          <header className="panel-shell flex items-center justify-between rounded-[28px] px-4 py-3 text-white lg:hidden">
            <div>
              <p className="eyebrow text-white/45">SM Gray</p>
              <p className="display-title text-3xl">Tool Bench</p>
            </div>

            <div className="flex items-center gap-3">
              {process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? <UserButton /> : null}
              <button
                aria-label={isDrawerOpen ? "Close navigation" : "Open navigation"}
                className="flex size-11 items-center justify-center rounded-[18px] border border-white/10 bg-white/8"
                onClick={() => setIsDrawerOpen((open) => !open)}
                type="button"
              >
                {isDrawerOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </header>

          {isDrawerOpen ? (
            <div className="panel-shell rounded-[28px] p-5 text-white lg:hidden">
              <NavigationContent onNavigate={() => setIsDrawerOpen(false)} />
            </div>
          ) : null}

          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </div>
    </div>
  );
}
