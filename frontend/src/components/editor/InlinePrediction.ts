import { Extension } from "@tiptap/react";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { API_BASE } from "@/lib/constants";

const pluginKey = new PluginKey("inlinePrediction");

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let abortController: AbortController | null = null;

async function fetchPrediction(
  projectSlug: string,
  textBeforeCursor: string
): Promise<string> {
  abortController?.abort();
  abortController = new AbortController();

  const res = await fetch(`${API_BASE}/api/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      project_slug: projectSlug,
      text_before_cursor: textBeforeCursor,
    }),
    signal: abortController.signal,
  });

  if (!res.ok) return "";
  const data = await res.json();
  return data.prediction || "";
}

export const InlinePrediction = Extension.create<{ projectSlug: string }>({
  name: "inlinePrediction",

  addOptions() {
    return { projectSlug: "" };
  },

  addProseMirrorPlugins() {
    const extensionThis = this;

    return [
      new Plugin({
        key: pluginKey,

        state: {
          init() {
            return { prediction: "", pos: -1 };
          },

          apply(tr, prev) {
            const meta = tr.getMeta(pluginKey);
            if (meta) return meta;
            // Clear prediction on any doc change OR selection change
            if (tr.docChanged || tr.selectionSet) {
              return { prediction: "", pos: -1 };
            }
            return prev;
          },
        },

        props: {
          decorations(state) {
            const { prediction, pos } = pluginKey.getState(state);
            if (!prediction || pos < 0) return DecorationSet.empty;

            // Verify the pos is still valid for the current doc
            if (pos > state.doc.content.size) return DecorationSet.empty;

            // Only show if cursor is still at the prediction position
            if (state.selection.from !== pos) return DecorationSet.empty;

            const widget = Decoration.widget(pos, () => {
              const span = document.createElement("span");
              span.textContent = prediction;
              span.className = "inline-prediction-ghost";
              span.style.color = "#475569";
              span.style.pointerEvents = "none";
              span.style.userSelect = "none";
              return span;
            }, { side: 1 }); // side: 1 places widget AFTER the position

            return DecorationSet.create(state.doc, [widget]);
          },

          handleKeyDown(view, event) {
            const { prediction, pos } = pluginKey.getState(view.state);

            if (prediction && event.key === "Tab") {
              event.preventDefault();
              const tr = view.state.tr.insertText(prediction, pos);
              tr.setMeta(pluginKey, { prediction: "", pos: -1 });
              view.dispatch(tr);
              return true;
            }

            if (prediction && event.key === "Escape") {
              event.preventDefault();
              const tr = view.state.tr.setMeta(pluginKey, {
                prediction: "",
                pos: -1,
              });
              view.dispatch(tr);
              return true;
            }

            // Any other key dismisses the prediction (it'll be cleared by apply())
            return false;
          },
        },

        view() {
          // Track the cursor position at the time we START the request
          let requestPos = -1;

          return {
            update(view, prevState) {
              // Only trigger on doc changes (user typed something)
              if (!view.state.doc.eq(prevState.doc)) {
                // Clear any pending request
                if (debounceTimer) clearTimeout(debounceTimer);
                abortController?.abort();

                const { selection } = view.state;
                if (!selection.empty) return;

                // Capture cursor pos NOW — this is where the ghost text should appear
                const cursorPos = selection.from;

                // Get the text node at cursor to check we're at the end of it
                const $pos = view.state.doc.resolve(cursorPos);
                const textBefore = view.state.doc.textBetween(0, cursorPos, "\n", "\n");

                // Need at least some text to predict
                if (textBefore.trim().length < 20) return;

                // Store the position we're requesting for
                requestPos = cursorPos;

                debounceTimer = setTimeout(async () => {
                  try {
                    const prediction = await fetchPrediction(
                      extensionThis.options.projectSlug,
                      textBefore
                    );
                    if (!prediction) return;

                    // Only apply if the cursor is STILL at the same position
                    const currentPos = view.state.selection.from;
                    if (currentPos !== requestPos) return;

                    // Verify the doc hasn't changed during the fetch
                    const currentText = view.state.doc.textBetween(
                      0,
                      currentPos,
                      "\n",
                      "\n"
                    );
                    if (currentText !== textBefore) return;

                    const tr = view.state.tr.setMeta(pluginKey, {
                      prediction,
                      pos: requestPos,
                    });
                    view.dispatch(tr);
                  } catch {
                    // Aborted or failed — ignore
                  }
                }, 1000);
              }
            },

            destroy() {
              if (debounceTimer) clearTimeout(debounceTimer);
              abortController?.abort();
            },
          };
        },
      }),
    ];
  },
});
