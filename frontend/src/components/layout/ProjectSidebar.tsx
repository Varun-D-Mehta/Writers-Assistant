"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { API_BASE } from "@/lib/constants";
import type { Part, Chapter, Project, StoryBible } from "@/lib/types";
import ProjectLogo from "@/components/ui/ProjectLogo";

interface PartWithChapters extends Part {
  chapters: Chapter[];
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`h-3.5 w-3.5 shrink-0 text-slate-500 transition-transform ${open ? "rotate-90" : ""}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 5l7 7-7 7"
      />
    </svg>
  );
}

export default function ProjectSidebar() {
  const params = useParams<{ projectSlug: string }>();
  const pathname = usePathname();
  const [project, setProject] = useState<Project | null>(null);
  const [parts, setParts] = useState<PartWithChapters[]>([]);
  const [bible, setBible] = useState<StoryBible | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    bible: true,
    book: true,
  });
  const [expandedBibleSections, setExpandedBibleSections] = useState<Record<string, boolean>>({
    characters: false,
    events: false,
    environment: false,
    objects: false,
  });
  const [expandedParts, setExpandedParts] = useState<Record<string, boolean>>({});
  const [showCreatePart, setShowCreatePart] = useState(false);
  const [showCreateChapter, setShowCreateChapter] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");

  const slug = params.projectSlug;

  useEffect(() => {
    loadProject();
    loadParts();
    loadBible();
  }, [slug]);

  useEffect(() => {
    if (parts.length > 0) {
      const newExpanded: Record<string, boolean> = { ...expandedParts };
      parts.forEach((part) => {
        const hasActive = part.chapters.some(
          (ch) =>
            pathname ===
            `/projects/${slug}/parts/${part.slug}/chapters/${ch.slug}`
        );
        if (hasActive) newExpanded[part.slug] = true;
      });
      if (Object.keys(expandedParts).length === 0) {
        parts.forEach((p) => (newExpanded[p.slug] = true));
      }
      setExpandedParts(newExpanded);
    }
  }, [parts, pathname]);

  async function loadProject() {
    try {
      const data = await apiFetch<Project>(`/api/projects/${slug}`);
      setProject(data);
    } catch {
      // Project might not be loaded yet
    }
  }

  async function loadParts() {
    const partsData = await apiFetch<Part[]>(
      `/api/projects/${slug}/parts`
    );
    const withChapters: PartWithChapters[] = await Promise.all(
      partsData.map(async (part) => {
        const chapters = await apiFetch<Chapter[]>(
          `/api/projects/${slug}/parts/${part.slug}/chapters`
        );
        return { ...part, chapters };
      })
    );
    setParts(withChapters);
  }

  async function loadBible() {
    try {
      const data = await apiFetch<StoryBible>(
        `/api/projects/${slug}/story-bible`
      );
      setBible(data);
    } catch {
      // Story bible might not exist yet
    }
  }

  function toggleSection(key: string) {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function toggleBibleSection(key: string) {
    setExpandedBibleSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function togglePart(partSlug: string) {
    setExpandedParts((prev) => ({ ...prev, [partSlug]: !prev[partSlug] }));
  }

  async function createPart(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    await apiFetch(`/api/projects/${slug}/parts`, {
      method: "POST",
      body: JSON.stringify({ title: newTitle.trim() }),
    });
    setNewTitle("");
    setShowCreatePart(false);
    loadParts();
  }

  async function createChapter(partSlug: string, e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    await apiFetch(
      `/api/projects/${slug}/parts/${partSlug}/chapters`,
      {
        method: "POST",
        body: JSON.stringify({ title: newTitle.trim() }),
      }
    );
    setNewTitle("");
    setShowCreateChapter(null);
    loadParts();
  }

  const overviewHref = `/projects/${slug}`;
  const charactersHref = `/projects/${slug}/characters`;
  const eventsHref = `/projects/${slug}/events`;
  const environmentHref = `/projects/${slug}/environment`;
  const objectsHref = `/projects/${slug}/objects`;

  const isOverviewActive = pathname === overviewHref;
  const isCharactersActive = pathname === charactersHref;
  const isEventsActive = pathname === eventsHref;
  const isEnvironmentActive = pathname === environmentHref;
  const isObjectsActive = pathname === objectsHref;

  const characters = bible?.characters ?? [];
  const events = bible?.events ?? [];
  const environments = bible?.environment ?? [];
  const objects = bible?.objects ?? [];

  return (
    <aside className="flex h-full w-56 flex-col border-r border-slate-700/50 bg-slate-900 text-sm">
      {/* Project header */}
      {project && (
        <div className="flex items-center gap-2 border-b border-slate-800 px-3 py-3">
          <ProjectLogo logo={project.logo} size="sm" />
          <span className="truncate text-sm font-semibold text-slate-200">
            {project.title}
          </span>
        </div>
      )}

      <nav className="flex-1 overflow-y-auto py-2">
        {/* -- Story Bible -- */}
        <div className="mb-1">
          <button
            onClick={() => toggleSection("bible")}
            className="flex w-full items-center gap-1.5 px-3 py-1.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 hover:text-slate-300"
          >
            <ChevronIcon open={expandedSections.bible} />
            Story Bible
          </button>

          {expandedSections.bible && (
            <div className="ml-3">
              {/* Overview */}
              <Link
                href={overviewHref}
                className={`flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left text-sm ${
                  isOverviewActive
                    ? "bg-blue-600/20 font-medium text-blue-400"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                }`}
              >
                <span className="text-xs">{"\uD83D\uDCCB"}</span>
                Overview
              </Link>

              {/* Characters */}
              <div>
                <div className="group flex items-center">
                  <button
                    onClick={() => toggleBibleSection("characters")}
                    className="shrink-0 rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                  >
                    <ChevronIcon open={expandedBibleSections.characters} />
                  </button>
                  <Link
                    href={charactersHref}
                    className={`flex flex-1 items-center gap-1.5 rounded-md px-1.5 py-1.5 text-left ${
                      isCharactersActive
                        ? "bg-blue-600/20 font-medium text-blue-400"
                        : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                    }`}
                  >
                    <span className="text-xs">{"\uD83D\uDC64"}</span>
                    <span>Characters</span>
                    {characters.length > 0 && (
                      <span className="ml-auto text-[10px] text-slate-600">
                        {characters.length}
                      </span>
                    )}
                  </Link>
                </div>
                {expandedBibleSections.characters && (
                  <div className="ml-5">
                    {characters.map((char, i) => (
                      <Link
                        key={i}
                        href={charactersHref}
                        className="flex w-full items-center gap-2 rounded-md px-3 py-1 text-left text-xs text-slate-500 hover:bg-slate-800 hover:text-slate-300"
                      >
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500/50" />
                        <span className="truncate">
                          {char.name || "Unnamed"}
                        </span>
                      </Link>
                    ))}
                    {characters.length === 0 && (
                      <p className="px-3 py-1 text-xs italic text-slate-600">
                        None yet
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Events */}
              <div>
                <div className="group flex items-center">
                  <button
                    onClick={() => toggleBibleSection("events")}
                    className="shrink-0 rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                  >
                    <ChevronIcon open={expandedBibleSections.events} />
                  </button>
                  <Link
                    href={eventsHref}
                    className={`flex flex-1 items-center gap-1.5 rounded-md px-1.5 py-1.5 text-left ${
                      isEventsActive
                        ? "bg-blue-600/20 font-medium text-blue-400"
                        : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                    }`}
                  >
                    <span className="text-xs">{"\u26A1"}</span>
                    <span>Events</span>
                    {events.length > 0 && (
                      <span className="ml-auto text-[10px] text-slate-600">
                        {events.length}
                      </span>
                    )}
                  </Link>
                </div>
                {expandedBibleSections.events && (
                  <div className="ml-5">
                    {events.map((event, i) => (
                      <Link
                        key={i}
                        href={eventsHref}
                        className="group/ev flex w-full items-center gap-2 rounded-md px-3 py-1 text-left text-xs text-slate-500 hover:bg-slate-800 hover:text-slate-300"
                      >
                        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-blue-500/40 text-[9px] font-bold text-blue-400">
                          {i + 1}
                        </span>
                        <span className="truncate">
                          {event.name || "Unnamed"}
                        </span>
                      </Link>
                    ))}
                    {events.length === 0 && (
                      <p className="px-3 py-1 text-xs italic text-slate-600">
                        None yet
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Environment */}
              <div>
                <div className="group flex items-center">
                  <button
                    onClick={() => toggleBibleSection("environment")}
                    className="shrink-0 rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                  >
                    <ChevronIcon open={expandedBibleSections.environment} />
                  </button>
                  <Link
                    href={environmentHref}
                    className={`flex flex-1 items-center gap-1.5 rounded-md px-1.5 py-1.5 text-left ${
                      isEnvironmentActive
                        ? "bg-blue-600/20 font-medium text-blue-400"
                        : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                    }`}
                  >
                    <span className="text-xs">{"\uD83C\uDF0D"}</span>
                    <span>Environment</span>
                    {environments.length > 0 && (
                      <span className="ml-auto text-[10px] text-slate-600">
                        {environments.length}
                      </span>
                    )}
                  </Link>
                </div>
                {expandedBibleSections.environment && (
                  <div className="ml-5">
                    {environments.map((env, i) => (
                      <Link
                        key={i}
                        href={environmentHref}
                        className="flex w-full items-center gap-2 rounded-md px-3 py-1 text-left text-xs text-slate-500 hover:bg-slate-800 hover:text-slate-300"
                      >
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-green-500/50" />
                        <span className="truncate">
                          {env.name || "Unnamed"}
                        </span>
                      </Link>
                    ))}
                    {environments.length === 0 && (
                      <p className="px-3 py-1 text-xs italic text-slate-600">
                        None yet
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Objects */}
              <div>
                <div className="group flex items-center">
                  <button
                    onClick={() => toggleBibleSection("objects")}
                    className="shrink-0 rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                  >
                    <ChevronIcon open={expandedBibleSections.objects} />
                  </button>
                  <Link
                    href={objectsHref}
                    className={`flex flex-1 items-center gap-1.5 rounded-md px-1.5 py-1.5 text-left ${
                      isObjectsActive
                        ? "bg-blue-600/20 font-medium text-blue-400"
                        : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                    }`}
                  >
                    <span className="text-xs">{"\uD83D\uDCE6"}</span>
                    <span>Objects</span>
                    {objects.length > 0 && (
                      <span className="ml-auto text-[10px] text-slate-600">
                        {objects.length}
                      </span>
                    )}
                  </Link>
                </div>
                {expandedBibleSections.objects && (
                  <div className="ml-5">
                    {objects.map((obj, i) => (
                      <Link
                        key={i}
                        href={objectsHref}
                        className="flex w-full items-center gap-2 rounded-md px-3 py-1 text-left text-xs text-slate-500 hover:bg-slate-800 hover:text-slate-300"
                      >
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500/50" />
                        <span className="truncate">
                          {obj.name || "Unnamed"}
                        </span>
                      </Link>
                    ))}
                    {objects.length === 0 && (
                      <p className="px-3 py-1 text-xs italic text-slate-600">
                        None yet
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="mx-3 my-2 border-t border-slate-800" />

        {/* -- Manuscript -- */}
        <div>
          <div className="flex items-center justify-between pr-2">
            <button
              onClick={() => toggleSection("book")}
              className="flex flex-1 items-center gap-1.5 px-3 py-1.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 hover:text-slate-300"
            >
              <ChevronIcon open={expandedSections.book} />
              Manuscript
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowCreatePart(true);
                setNewTitle("");
                setExpandedSections((prev) => ({ ...prev, book: true }));
              }}
              className="rounded p-0.5 text-slate-600 hover:bg-slate-800 hover:text-blue-400"
              title="Add part"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>

          {expandedSections.book && (
            <div className="ml-3">
              {parts.map((part) => {
                const isPartExpanded = expandedParts[part.slug] ?? true;
                return (
                  <div key={part.slug} className="mb-0.5">
                    <div className="group flex items-center">
                      <button
                        onClick={() => togglePart(part.slug)}
                        className="flex flex-1 items-center gap-1.5 rounded-md px-3 py-1.5 text-left text-slate-300 hover:bg-slate-800"
                      >
                        <ChevronIcon open={isPartExpanded} />
                        <span className="text-xs">{"\uD83D\uDCC1"}</span>
                        <span className="truncate font-medium">{part.title}</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowCreateChapter(part.slug);
                          setNewTitle("");
                          setExpandedParts((prev) => ({
                            ...prev,
                            [part.slug]: true,
                          }));
                        }}
                        className="mr-2 rounded p-0.5 text-slate-600 opacity-0 transition group-hover:opacity-100 hover:bg-slate-700 hover:text-blue-400"
                        title="Add chapter"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </button>
                    </div>

                    {isPartExpanded && (
                      <div className="ml-5">
                        {part.chapters.map((chapter) => {
                          const href = `/projects/${slug}/parts/${part.slug}/chapters/${chapter.slug}`;
                          const isActive = pathname === href;
                          return (
                            <Link
                              key={chapter.slug}
                              href={href}
                              className={`flex items-center gap-2 rounded-md px-3 py-1.5 ${
                                isActive
                                  ? "bg-blue-600/20 font-medium text-blue-400"
                                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                              }`}
                            >
                              <span className="text-xs">{"\uD83D\uDCC4"}</span>
                              <span className="truncate">{chapter.title}</span>
                            </Link>
                          );
                        })}

                        {showCreateChapter === part.slug && (
                          <form
                            onSubmit={(e) => createChapter(part.slug, e)}
                            className="px-3 py-1"
                          >
                            <input
                              autoFocus
                              value={newTitle}
                              onChange={(e) => setNewTitle(e.target.value)}
                              placeholder="Chapter title..."
                              className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-200 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                              onBlur={() => !newTitle && setShowCreateChapter(null)}
                              onKeyDown={(e) =>
                                e.key === "Escape" && setShowCreateChapter(null)
                              }
                            />
                          </form>
                        )}

                        {part.chapters.length === 0 &&
                          showCreateChapter !== part.slug && (
                            <p className="px-3 py-1 text-xs italic text-slate-600">
                              No chapters
                            </p>
                          )}
                      </div>
                    )}
                  </div>
                );
              })}

              {showCreatePart && (
                <form onSubmit={createPart} className="px-3 py-1">
                  <input
                    autoFocus
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Part title..."
                    className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-200 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                    onBlur={() => !newTitle && setShowCreatePart(false)}
                    onKeyDown={(e) =>
                      e.key === "Escape" && setShowCreatePart(false)
                    }
                  />
                </form>
              )}

              {parts.length === 0 && !showCreatePart && (
                <p className="px-3 py-1.5 text-xs italic text-slate-600">
                  No parts yet
                </p>
              )}
            </div>
          )}
        </div>
      </nav>

      {/* Export buttons */}
      <div className="border-t border-slate-800 p-2">
        <div className="flex gap-1">
          <button
            onClick={async () => {
              const res = await fetch(`${API_BASE}/api/projects/${slug}/export/txt`);
              const blob = await res.blob();
              const a = document.createElement("a");
              a.href = URL.createObjectURL(blob);
              a.download = `${slug}.txt`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(a.href);
            }}
            className="flex-1 rounded px-2 py-1.5 text-[10px] text-slate-500 hover:bg-slate-800 hover:text-slate-300"
          >
            Export TXT
          </button>
          <button
            onClick={async () => {
              const res = await fetch(`${API_BASE}/api/projects/${slug}/export/pdf`);
              const blob = await res.blob();
              const a = document.createElement("a");
              a.href = URL.createObjectURL(blob);
              a.download = `${slug}.pdf`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(a.href);
            }}
            className="flex-1 rounded px-2 py-1.5 text-[10px] text-slate-500 hover:bg-slate-800 hover:text-slate-300"
          >
            Export PDF
          </button>
        </div>
      </div>
    </aside>
  );
}
