export type EventLogEntry = {
  status: "published" | "rejected";
  type: string;
  payload?: unknown;
  source?: string;
  error?: string;
  at: number;
};

function formatTime(at: number) {
  return new Date(at).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatPayload(payload: unknown) {
  if (payload === undefined) {
    return "";
  }
  try {
    return JSON.stringify(payload);
  } catch {
    return String(payload);
  }
}

function renderEntry(entry: EventLogEntry) {
  const statusLabel = entry.status === "published" ? "published" : "rejected";
  const detail =
    entry.status === "rejected"
      ? `<span class="event-log-error">${entry.error}</span>`
      : `<code class="event-log-payload">${formatPayload(entry.payload)}</code>`;

  return `
    <li class="event-log-entry event-log-entry--${entry.status}" data-testid="event-log-entry" data-status="${entry.status}">
      <span class="event-log-time">${formatTime(entry.at)}</span>
      <span class="event-log-type">${entry.type}</span>
      <span class="event-log-source">${entry.source || "unknown"}</span>
      ${detail}
    </li>
  `;
}

export function createEventBusViewer(root: HTMLElement, maxEntries = 20) {
  const list = root.querySelector("[data-testid='event-log-list']") as HTMLOListElement;
  const emptyState = root.querySelector("[data-testid='event-log-empty']") as HTMLElement;
  const entries: EventLogEntry[] = [];

  function render() {
    if (!list || !emptyState) {
      return;
    }

    if (entries.length === 0) {
      list.innerHTML = "";
      emptyState.hidden = false;
      return;
    }

    emptyState.hidden = true;
    list.innerHTML = entries.map((entry) => renderEntry(entry)).join("");
  }

  function append(entry: EventLogEntry) {
    entries.unshift(entry);
    if (entries.length > maxEntries) {
      entries.length = maxEntries;
    }
    render();
  }

  function clear() {
    entries.length = 0;
    render();
  }

  root.querySelector("#clear-event-log-btn")?.addEventListener("click", clear);
  render();

  return {
    append,
    clear,
    getEntries: () => entries.map((entry) => ({ ...entry })),
  };
}
