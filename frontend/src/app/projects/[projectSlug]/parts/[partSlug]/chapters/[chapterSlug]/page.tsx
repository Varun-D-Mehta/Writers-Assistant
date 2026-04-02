"use client";

import { useState, useCallback } from "react";
import { useParams } from "next/navigation";
import type { Editor } from "@tiptap/react";
import ChapterEditor from "@/components/editor/ChapterEditor";
import SidePanel from "@/components/side-panel/SidePanel";

export default function ChapterPage() {
  const params = useParams<{
    projectSlug: string;
    partSlug: string;
    chapterSlug: string;
  }>();
  const [editor, setEditor] = useState<Editor | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [rewriteRequest, setRewriteRequest] = useState<string | null>(null);

  const handleEditorReady = useCallback((e: Editor | null) => {
    setEditor(e);
  }, []);

  function handleRequestRewrite(selectedText: string) {
    setCollapsed(false);
    setRewriteRequest(selectedText);
  }

  return (
    <div className="flex h-full">
      <div
        className={`overflow-hidden transition-all ${collapsed ? "flex-1" : "w-[65%]"}`}
      >
        <ChapterEditor
          projectSlug={params.projectSlug}
          partSlug={params.partSlug}
          chapterSlug={params.chapterSlug}
          onEditorReady={handleEditorReady}
          onRequestRewrite={handleRequestRewrite}
        />
      </div>
      <div
        className={`overflow-hidden transition-all ${collapsed ? "w-12" : "w-[35%]"}`}
      >
        <SidePanel
          projectSlug={params.projectSlug}
          partSlug={params.partSlug}
          chapterSlug={params.chapterSlug}
          editor={editor}
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed(!collapsed)}
          rewriteRequest={rewriteRequest}
          onRewriteHandled={() => setRewriteRequest(null)}
        />
      </div>
    </div>
  );
}
