import Link from "next/link";
import ProjectSidebar from "@/components/layout/ProjectSidebar";

export default function ProjectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center border-b border-slate-700/50 bg-slate-900 px-4 py-2">
        <Link
          href="/"
          className="text-sm font-medium text-slate-400 hover:text-blue-400"
        >
          Projects
        </Link>
        <span className="mx-2 text-slate-600">/</span>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <ProjectSidebar />
        <main className="flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
