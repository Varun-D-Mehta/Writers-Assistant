"use client";

import { useState, useEffect } from "react";
import { Joyride, STATUS } from "react-joyride";
import type { Step, EventData } from "react-joyride";

const STORAGE_KEY = "wa_workspace_tour_complete";

const STEPS: Step[] = [
  {
    target: "body",
    placement: "center",
    title: "Your Workspace",
    content: "This is your project workspace. Let's walk through the key areas.",
  },
  {
    target: '[data-tour="story-bible"]',
    title: "Story Bible",
    content: "Your world-building hub. Add characters, events, environments, and objects. The AI reads this to understand your story.",
    placement: "right",
  },
  {
    target: '[data-tour="manuscript"]',
    title: "Manuscript",
    content: "Organize your writing into Parts and Chapters. Click the + button to add new ones.",
    placement: "right",
  },
  {
    target: '[data-tour="editor-area"]',
    title: "Chapter Editor",
    content: "Write here with formatting support. AI predictions appear as ghost text — press Tab to accept.",
    placement: "bottom",
  },
  {
    target: '[data-tour="chat-tab"]',
    title: "AI Chat",
    content: "Context-aware conversations about your chapter. Brainstorm, get suggestions, or ask questions about your story.",
    placement: "left",
  },
  {
    target: '[data-tour="ideas-tab"]',
    title: "Smart Ideas",
    content: "Request AI rewrites, expansions, or fixes. Review changes in a diff view and accept or reject.",
    placement: "left",
  },
  {
    target: '[data-tour="context-tab"]',
    title: "Context Check",
    content: "Scan your chapter against the story bible to catch inconsistencies with auto-fix suggestions.",
    placement: "left",
  },
  {
    target: '[data-tour="export-buttons"]',
    title: "Export Your Work",
    content: "Export as PDF or TXT. Always export before ending a session — your data is ephemeral!",
    placement: "top",
  },
  {
    target: "body",
    placement: "center",
    title: "You're ready!",
    content: "Start by adding entries to your Story Bible, then create chapters and write. The AI gets smarter as you add more context.",
  },
];

export default function OnboardingTutorial() {
  const [run, setRun] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Only show if welcome was shown (user is past home page) but workspace tour hasn't run
    const welcomeShown = localStorage.getItem("wa_welcome_shown");
    const tourDone = localStorage.getItem(STORAGE_KEY);
    if (welcomeShown && !tourDone) {
      // Wait for sidebar and panel to render
      setTimeout(() => setRun(true), 1500);
    }
  }, []);

  function handleEvent(data: EventData) {
    if (data.status === STATUS.FINISHED || data.status === STATUS.SKIPPED) {
      localStorage.setItem(STORAGE_KEY, "true");
      setRun(false);
    }
  }

  if (!mounted || !run) return null;

  return (
    <Joyride
      steps={STEPS}
      continuous
      onEvent={handleEvent}
      options={{
        showProgress: true,
        primaryColor: "#6366f1",
        backgroundColor: "#0d1528",
        textColor: "#cbd5e1",
        arrowColor: "#0d1528",
        overlayColor: "rgba(0, 0, 0, 0.6)",
      }}
    />
  );
}
