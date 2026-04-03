import Link from "next/link";
import ProjectSidebar from "@/components/layout/ProjectSidebar";

export default function ProjectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center border-b px-4 py-2 surface-1" style={{ borderColor: "var(--border)" }}>
        <Link
          href="/"
          className="text-sm font-medium text-slate-400 transition hover:text-indigo-400"
        >
          Projects
        </Link>
        <span className="mx-2 text-slate-700">/</span>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <ProjectSidebar />
        <main className="flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
