"use client";

import { ExternalLink, Search } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";

const sites = [
  {
    name: "Pirate Bay",
    home: "https://thepiratebay.org/",
    buildUrl: (term: string) =>
      `https://thepiratebay.org/search.php?q=${encodeURIComponent(term)}`,
  },
  {
    name: "1337x",
    home: "https://1337x.to/home/",
    buildUrl: (term: string) =>
      `https://1337x.to/search/${encodeURIComponent(term)}/1/`,
  },
  {
    name: "Torrent Galaxy",
    home: "https://torrentgalaxy.to/",
    buildUrl: (term: string) =>
      `https://torrentgalaxy.to/torrents.php?search=${encodeURIComponent(term)}&sort=seeders&order=desc`,
  },
  {
    name: "BitSearch",
    home: "https://bitsearch.to/",
    buildUrl: (term: string) =>
      `https://bitsearch.to/search?q=${encodeURIComponent(term)}&sort=seeders`,
  },
  {
    name: "IPTorrents",
    home: "https://iptorrents.com/t",
    buildUrl: (term: string) =>
      `https://iptorrents.com/t?q=${encodeURIComponent(term)};o=seeders#torrents`,
  },
];

function targetUrl(site: (typeof sites)[number], term: string) {
  return term ? site.buildUrl(term) : site.home;
}

function refocusSearch() {
  window.setTimeout(() => {
    window.focus();
    document.querySelector<HTMLInputElement>("#torrent-search-term")?.focus({
      preventScroll: true,
    });
  }, 50);
}

export function TorrentSearchTool() {
  const [term, setTerm] = useState(() => {
    if (typeof window === "undefined") {
      return "";
    }

    return new URLSearchParams(window.location.search).get("searchTerm") ?? "";
  });
  const [status, setStatus] = useState("");

  useEffect(() => {
    const nextParams = new URLSearchParams();

    if (term.trim()) {
      nextParams.set("searchTerm", term.trim());
    }

    const nextUrl = `${window.location.pathname}${
      nextParams.toString() ? `?${nextParams}` : ""
    }`;

    window.history.replaceState({}, "", nextUrl);
  }, [term]);

  function openTarget(target: { name: string; url: string }) {
    const tab = window.open(target.url, "_blank", "noopener,noreferrer");

    if (!tab) {
      setStatus(`Chrome blocked ${target.name}. Allow pop-ups for smgray.com.`);
      return false;
    }

    try {
      tab.opener = null;
      tab.blur();
    } catch {
      // Cross-origin tabs may not allow focus control.
    }

    refocusSearch();
    setStatus(`Opened ${target.name}.`);
    return true;
  }

  function openAll(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const targets = sites.map((site) => ({
      name: site.name,
      url: targetUrl(site, term.trim()),
    }));
    const opened = targets.filter(openTarget).length;

    refocusSearch();
    setStatus(
      opened === targets.length
        ? `Opened ${opened} tabs.`
        : `Chrome opened ${opened} of ${targets.length} tabs. Allow pop-ups for smgray.com, then try again.`,
    );
  }

  return (
    <div className="space-y-6">
      <section className="panel-shell overflow-hidden rounded-[34px] p-6 text-white md:p-8">
        <div className="max-w-3xl">
          <p className="eyebrow text-white/48">Search Bench</p>
          <h1 className="display-title mt-3 text-5xl md:text-7xl">
            Torrent Search
          </h1>
          <p className="mt-5 text-base leading-7 text-white/68 md:text-lg">
            One private shortcut page for building search links across the
            torrent indexes you already use.
          </p>
        </div>
      </section>

      <section className="panel-work rounded-[34px] p-5 md:p-7">
        <form
          className="grid gap-3 rounded-[28px] border border-ink/10 bg-white/50 p-3 shadow-[0_18px_40px_rgba(24,20,15,0.08)] md:grid-cols-[1fr_auto]"
          onSubmit={openAll}
        >
          <label className="grid gap-2 text-sm font-bold text-ink-soft">
            Search term
            <input
              autoComplete="off"
              autoFocus
              className="min-h-14 rounded-[18px] border border-ink/10 bg-paper-soft px-4 text-lg text-ink outline-none transition focus:border-ink/40 focus:ring-4 focus:ring-signal/15"
              id="torrent-search-term"
              name="searchTerm"
              onChange={(event) => {
                setTerm(event.target.value);
                setStatus("");
              }}
              value={term}
            />
          </label>

          <button
            className="flex min-h-14 items-center justify-center gap-2 rounded-full border border-ink bg-ink px-6 font-black text-paper-soft transition hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(24,20,15,0.16)]"
            type="submit"
          >
            <Search size={18} />
            Open all
          </button>
        </form>

        <p className="min-h-6 px-2 pt-3 text-sm leading-6 text-ink-soft" role="status">
          {status}
        </p>

        <div className="grid gap-3 md:grid-cols-2">
          {sites.map((site) => {
            const url = targetUrl(site, term.trim());

            return (
              <button
                className="group grid min-h-44 gap-4 rounded-[26px] border border-ink/10 bg-white/55 p-5 text-left shadow-[0_12px_28px_rgba(24,20,15,0.07)] transition hover:-translate-y-0.5 hover:border-ink/20 hover:bg-white/72 hover:shadow-[0_18px_38px_rgba(24,20,15,0.11)]"
                key={site.name}
                onClick={() => openTarget({ name: site.name, url })}
                type="button"
              >
                <div>
                  <h2 className="text-2xl font-black text-ink">{site.name}</h2>
                  <p className="mt-3 break-words text-sm leading-6 text-ink-soft">
                    {url}
                  </p>
                </div>

                <span className="flex items-center justify-between border-t border-ink/10 pt-4 font-black text-ink">
                  Open
                  <ExternalLink
                    className="transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                    size={18}
                  />
                </span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
