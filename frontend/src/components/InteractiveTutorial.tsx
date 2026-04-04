"use client";

import { useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";

const STORAGE_KEY = "wa_tutorial_step";
const COMPLETE_KEY = "wa_tutorial_complete";

interface TutorialStep {
  id: string;
  title: string;
  instruction: string;
  hint?: string;
  /** Where the user should be for this step (path prefix) */
  requiredPath?: string;
  /** If true, user must click "Done" manually. Otherwise auto-advances on path change. */
  manualAdvance?: boolean;
  /** If set, show a download link */
  downloadFile?: string;
  /** Highlight a data-tour element */
  highlight?: string;
}

const STEPS: TutorialStep[] = [
  {
    id: "welcome",
    title: "Welcome! Let's learn by doing.",
    instruction: "This tutorial will walk you through a real workflow. You'll import a sample project, explore the story bible, use AI features, and export your work. Every step requires you to actually do it.",
    hint: "Click \"Next\" to start.",
    manualAdvance: true,
  },
  {
    id: "download",
    title: "Step 1: Download the sample project",
    instruction: "First, download this sample project file. It's a short fantasy/mystery story called \"The Clockmaker's Daughter\" — complete with characters, events, settings, and two chapters.",
    hint: "Click the download button, then click \"Next\" when you have the file.",
    downloadFile: "/tutorial-project.txt",
    manualAdvance: true,
  },
  {
    id: "import",
    title: "Step 2: Import the project",
    instruction: "Now import the file you just downloaded. Click \"Import Project\" in the top right, select the tutorial-project.txt file, and wait for the progress bar to complete.",
    hint: "The project will appear in the list when import finishes. Click on it to open.",
    requiredPath: "/",
    highlight: "import-button",
  },
  {
    id: "enter-project",
    title: "Step 3: Open the project",
    instruction: "Click on \"The Clockmaker's Daughter\" to enter the project workspace.",
    hint: "You'll see the sidebar with Story Bible and Manuscript sections.",
    requiredPath: "/projects/",
  },
  {
    id: "story-bible",
    title: "Step 4: Explore the Story Bible",
    instruction: "The Story Bible is where your world lives. Click through each section in the sidebar: Overview, Characters, Events, Environment, and Objects. Notice how each entry has structured fields — this is what the AI reads to understand your story.",
    hint: "Click on \"Characters\" in the sidebar to see Ada, Silas, and Inspector Marsh.",
    requiredPath: "/projects/",
    highlight: "story-bible",
    manualAdvance: true,
  },
  {
    id: "characters",
    title: "Step 5: Edit a character",
    instruction: "Click on \"Characters\" in the sidebar. Try editing Ada Thorne's description or adding a new trait. The AI uses these details for context-aware suggestions.",
    hint: "Every change auto-saves. Notice the labeled fields: Description, Traits, Notes.",
    requiredPath: "/characters",
    manualAdvance: true,
  },
  {
    id: "environment",
    title: "Step 6: Check the environments",
    instruction: "Click \"Environment\" in the sidebar. See how each setting has a description plus key-value details (Climate, Atmosphere, etc.). This structured data helps the AI maintain consistency.",
    hint: "Try adding a new detail to Thorne's Clockwork Shop.",
    requiredPath: "/environment",
    manualAdvance: true,
  },
  {
    id: "open-chapter",
    title: "Step 7: Open a chapter",
    instruction: "In the sidebar under Manuscript → Act One, click on \"The Letter\" to open the chapter editor. This is where you write.",
    hint: "The editor appears on the left, the AI panel on the right.",
    requiredPath: "/chapters/",
  },
  {
    id: "editor",
    title: "Step 8: Try the editor",
    instruction: "Click into the text and start typing a new sentence at the end. As you type, watch for ghost text predictions — the AI completes your sentences based on your story context. Press Tab to accept a prediction.",
    hint: "The predictions use your story bible and chapter content for context. They appear in lighter text after your cursor.",
    requiredPath: "/chapters/",
    manualAdvance: true,
  },
  {
    id: "chat",
    title: "Step 9: Talk to the AI",
    instruction: "In the right panel, make sure the \"Chat\" tab is selected. Type a message like: \"What should happen next in this chapter?\" — the AI will respond using your story bible and chapter content as context.",
    hint: "The AI knows about Ada, Silas, the clocks, and everything in your story bible.",
    requiredPath: "/chapters/",
    highlight: "chat-tab",
    manualAdvance: true,
  },
  {
    id: "ideas",
    title: "Step 10: Request an AI idea",
    instruction: "Click the \"Ideas\" tab in the right panel, then click \"+ Request Idea\". Select some text in the editor first, or just type an instruction like \"Expand this paragraph with more sensory details\". Choose a type and click Generate.",
    hint: "The AI returns a diff view showing original vs. proposed text. You can Accept or Reject.",
    requiredPath: "/chapters/",
    highlight: "ideas-tab",
    manualAdvance: true,
  },
  {
    id: "context-check",
    title: "Step 11: Run a context check",
    instruction: "Click the \"Context Check\" tab and hit the \"Run Context Check\" button. The AI will scan this chapter against your story bible and flag any inconsistencies.",
    hint: "Each issue shows the severity, the problematic quote, and an auto-fix option.",
    requiredPath: "/chapters/",
    highlight: "context-tab",
    manualAdvance: true,
  },
  {
    id: "export",
    title: "Step 12: Export your project",
    instruction: "In the bottom of the sidebar, click \"Export TXT\" or \"Export PDF\". This downloads your entire project — manuscript and story bible — as a single file. This is your backup.",
    hint: "Your data only exists during this session. When you close the tab, it's gone. Always export!",
    highlight: "export-buttons",
    manualAdvance: true,
  },
  {
    id: "done",
    title: "You're ready!",
    instruction: "That's the full workflow: Import → Story Bible → Write → Chat → Ideas → Context Check → Export. Your project data is ephemeral — it exists only during your session. Always export before closing the tab. Happy writing!",
    hint: "Click \"Finish\" to close this tutorial. You can always restart it from Settings.",
    manualAdvance: true,
  },
];

export default function InteractiveTutorial() {
  const [step, setStep] = useState<number>(-1); // -1 = not started
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
    const completed = localStorage.getItem(COMPLETE_KEY);
    if (completed) {
      setStep(-1);
      return;
    }
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved !== null) {
      setStep(parseInt(saved, 10));
    } else {
      // First visit — auto-start
      setStep(0);
    }
  }, []);

  // Auto-advance on path change for non-manual steps
  useEffect(() => {
    if (step < 0 || step >= STEPS.length) return;
    const current = STEPS[step];
    if (current.manualAdvance) return;
    if (current.requiredPath && pathname.includes(current.requiredPath)) {
      // Path matches — advance after a short delay
      const timer = setTimeout(() => advance(), 800);
      return () => clearTimeout(timer);
    }
  }, [pathname, step]);

  const advance = useCallback(() => {
    const next = step + 1;
    if (next >= STEPS.length) {
      localStorage.setItem(COMPLETE_KEY, "true");
      localStorage.removeItem(STORAGE_KEY);
      setStep(-1);
    } else {
      setStep(next);
      localStorage.setItem(STORAGE_KEY, String(next));
    }
  }, [step]);

  function dismiss() {
    localStorage.setItem(COMPLETE_KEY, "true");
    localStorage.removeItem(STORAGE_KEY);
    setStep(-1);
  }

  if (!mounted || step < 0 || step >= STEPS.length) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <>
      {/* Highlight overlay */}
      {current.highlight && (
        <style>{`
          [data-tour="${current.highlight}"] {
            position: relative;
            z-index: 40;
            box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.3), 0 0 20px rgba(99, 102, 241, 0.1);
            border-radius: 8px;
          }
        `}</style>
      )}

      {/* Tutorial panel — fixed bottom right */}
      <div
        className="fixed bottom-4 right-4 z-50 w-96 rounded-2xl border shadow-2xl"
        style={{
          borderColor: "rgba(99, 102, 241, 0.2)",
          background: "linear-gradient(180deg, #0d1528 0%, #111a30 100%)",
          boxShadow: "0 25px 60px -12px rgba(0, 0, 0, 0.5), 0 0 40px -10px rgba(99, 102, 241, 0.1)",
        }}
      >
        {/* Progress bar */}
        <div className="h-1 overflow-hidden rounded-t-2xl bg-slate-800">
          <div
            className="h-full bg-indigo-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="p-5">
          {/* Step counter */}
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-400">
              {step === 0 ? "Tutorial" : step === STEPS.length - 1 ? "Complete" : `Step ${step} of ${STEPS.length - 2}`}
            </span>
            <button
              onClick={dismiss}
              className="text-[10px] text-slate-600 transition hover:text-slate-400"
            >
              Skip tutorial
            </button>
          </div>

          {/* Title */}
          <h3 className="text-sm font-semibold text-slate-100">
            {current.title}
          </h3>

          {/* Instruction */}
          <p className="mt-2 text-xs leading-relaxed text-slate-400">
            {current.instruction}
          </p>

          {/* Download button */}
          {current.downloadFile && (
            <a
              href={current.downloadFile}
              download="tutorial-project.txt"
              className="mt-3 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium text-indigo-400 transition hover:bg-indigo-500/10"
              style={{ borderColor: "rgba(99, 102, 241, 0.2)" }}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download tutorial-project.txt
            </a>
          )}

          {/* Hint */}
          {current.hint && (
            <p className="mt-3 rounded-lg border px-3 py-2 text-[11px] text-slate-500"
              style={{ borderColor: "rgba(99, 102, 241, 0.1)", background: "rgba(99, 102, 241, 0.03)" }}
            >
              {current.hint}
            </p>
          )}

          {/* Actions */}
          <div className="mt-4 flex items-center justify-between">
            {step > 0 ? (
              <button
                onClick={() => { setStep(step - 1); localStorage.setItem(STORAGE_KEY, String(step - 1)); }}
                className="text-xs text-slate-500 transition hover:text-slate-300"
              >
                ← Back
              </button>
            ) : <span />}

            {current.manualAdvance && (
              <button
                onClick={advance}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-medium text-white transition hover:bg-indigo-500"
              >
                {isLast ? "Finish Tutorial" : "Next →"}
              </button>
            )}

            {!current.manualAdvance && (
              <span className="flex items-center gap-1.5 text-[10px] text-slate-600">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-indigo-500" />
                Waiting for you to complete this step...
              </span>
            )}
          </div>
        </div>
      </div>
    </>
  );
}


/**
 * Hook to restart the tutorial (e.g. from a settings menu)
 */
export function useRestartTutorial() {
  return () => {
    localStorage.removeItem(COMPLETE_KEY);
    localStorage.setItem(STORAGE_KEY, "0");
    window.location.reload();
  };
}
