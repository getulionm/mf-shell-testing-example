import {
  createEventBus,
  createShellContext,
  validateRemoteManifest,
  EVENT_TYPES,
} from "@mf/module-contracts";
import { shouldFailManifest, setFault, resetFaults } from "@mf/fault-toggles";
import { manifests } from "./manifests";
import { createEventBusViewer, type EventLogEntry } from "./eventBusViewer";
import { renderLearningManual } from "./learningManual";

const loaderByMountModule: Record<string, () => Promise<any>> = {
  "records/mount": () => import(/* @vite-ignore */ "recordsRemote/mount"),
  "tools/mount": () => import(/* @vite-ignore */ "toolsRemote/mount"),
};

function makeStatus(message: string, isError: boolean) {
  const status = document.createElement("p");
  status.className = isError ? "status error" : "status";
  status.textContent = message;
  return status;
}

function renderShellChrome(
  shellHost: HTMLElement,
  context: any,
  onWorkspaceChange: (workspace: string) => void,
  onReloadRemotes: () => void
) {
  shellHost.innerHTML = `
    <div class="shell-app">
      <header class="shell-header" data-testid="shell-header">
        <span class="shell-title">CONTROL PLANE</span>
        <label for="workspace-select">Workspace</label>
        <select id="workspace-select" aria-label="Workspace">
          <option value="ADMIN">ADMIN</option>
          <option value="USER">USER</option>
        </select>
        <button type="button" id="reload-remotes-btn">Reload remotes</button>
        <span class="shell-spacer"></span>
        <span data-testid="shell-user">${context.user}</span>
      </header>
      <div class="shell-body layout">
        <aside class="side-nav" data-testid="nav-drawer">
          <p class="nav-hint">
            Shell loads both remotes and brokers events between them.
          </p>
          <section class="topology-panel" data-testid="topology-panel">
            <h2>Topology</h2>
            <p data-testid="topology-host"><strong>Host under test:</strong> Control Plane</p>
            <p data-testid="topology-remote-a"><strong>Remote A (Team A):</strong> Task Creator</p>
            <p data-testid="topology-remote-b"><strong>Remote B (Team B):</strong> Task Summary</p>
          </section>
        </aside>
        <main class="main">
          <div id="shell-status" data-testid="shell-status"></div>
          <section class="remote-grid" data-testid="remote-grid">
            <article class="remote-slot remote-slot-tools" data-testid="remote-slot-tools">
              <h2 class="remote-slot-title">Remote A (Team A): Task Creator</h2>
              <div id="remote-outlet-tools"></div>
            </article>
            <article class="remote-slot remote-slot-records" data-testid="remote-slot-records">
              <h2 class="remote-slot-title">Remote B (Team B): Task Summary</h2>
              <div id="remote-outlet-records"></div>
            </article>
          </section>
        </main>
      </div>
      <section class="event-bus-panel" data-testid="event-bus-panel">
        <div class="event-bus-panel-toolbar">
          <div class="event-bus-panel-heading">
            <h2>Event Bus</h2>
            <p class="event-bus-panel-hint">Latest cross-remote events and validation results</p>
          </div>
          <button type="button" id="clear-event-log-btn">Clear log</button>
        </div>
        <p class="event-log-empty" data-testid="event-log-empty">Events will appear here when remotes publish through the shell.</p>
        <ol class="event-log-list" data-testid="event-log-list"></ol>
      </section>
    </div>
  `;

  const select = shellHost.querySelector("#workspace-select") as HTMLSelectElement;
  select.value = context.workspace;
  select.addEventListener("change", (event) =>
    onWorkspaceChange((event.target as HTMLSelectElement).value)
  );
  shellHost.querySelector("#reload-remotes-btn")?.addEventListener("click", onReloadRemotes);
}

async function loadRemoteModule(manifest: any) {
  if (shouldFailManifest(manifest.name)) {
    throw new Error(`${manifest.name} manifest unavailable`);
  }
  const loader = loaderByMountModule[manifest.mountModule];
  if (!loader) {
    throw new Error(`No loader for mount module ${manifest.mountModule}`);
  }
  return loader();
}

export function wireTaskBroker(
  eventBus: any,
  readState: () => { total: number; open: number; done: number; tasks: Array<{ title: string; status: "created" | "done" }> },
  writeState: (next: {
    total: number;
    open: number;
    done: number;
    tasks: Array<{ title: string; status: "created" | "done" }>;
  }) => void
) {
  return eventBus.subscribe(EVENT_TYPES.TASK_CREATED, (event: any) => {
    const current = readState();
    const next = {
      total: current.total + 1,
      open: current.open + 1,
      done: current.done,
      tasks: [...current.tasks, { title: event.payload.title, status: "created" as const }],
    };
    writeState(next);
    eventBus.publish(EVENT_TYPES.TASK_STATS_UPDATED, { ...next, tasks: [...next.tasks] }, "shell");
  });
}

function isLikelyRemoteDevServerDown(error: unknown) {
  const message = String((error as any)?.message || error).toLowerCase();
  return (
    message.includes("remoteentry.js") ||
    message.includes("loading script failed") ||
    message.includes("connection refused") ||
    message.includes("failed to fetch") ||
    message.includes("networkerror")
  );
}

function renderRemoteFallback(container: HTMLElement, manifestName: string, error: unknown) {
  const fallback = document.createElement("div");
  fallback.className = "module-unavailable";
  fallback.setAttribute("data-testid", `module-unavailable-${manifestName}`);
  const devServerHint = isLikelyRemoteDevServerDown(error)
    ? `<p class="module-unavailable-hint" data-testid="remote-dev-hint-${manifestName}">
         Start all apps with <code>npm run dev</code>, then click <strong>Reload remotes</strong>.
       </p>`
    : "";
  fallback.innerHTML = `
    <h3>Module unavailable</h3>
    <p>Remote <strong>${manifestName}</strong> could not load.</p>
    <p>${String((error as any).message || error)}</p>
    ${devServerHint}
  `;
  container.replaceChildren(fallback);
}

export function bootstrapShell(root: HTMLElement) {
  root.classList.add("app-page");
  root.innerHTML = `
    <div data-testid="learning-manual-root"></div>
    <div class="shell-boundary" data-testid="shell-host"></div>
  `;

  renderLearningManual(root.querySelector("[data-testid='learning-manual-root']") as HTMLElement);
  const shellHost = root.querySelector("[data-testid='shell-host']") as HTMLElement;

  let context = createShellContext();
  let taskState = { total: 0, open: 0, done: 0, tasks: [] as Array<{ title: string; status: "created" | "done" }> };
  const cleanupByRemote = new Map();
  const shellStatus = () => shellHost.querySelector("#shell-status") as HTMLElement;

  renderShellChrome(
    shellHost,
    context,
    (workspace) => {
      context = createShellContext({
        workspace,
        permissions: { canCreateTask: workspace === "ADMIN" },
      });
      mountAllRemotes();
    },
    () => mountAllRemotes()
  );

  const eventBusPanel = shellHost.querySelector("[data-testid='event-bus-panel']") as HTMLElement;
  const eventLog = createEventBusViewer(eventBusPanel, 20);

  const eventBus = createEventBus((event: EventLogEntry) => {
    eventLog.append(event);
  });

  (window as any).__MF_FAULTS__ = { setFault, resetFaults };
  (window as any).__MF_EVENT_LOG__ = {
    getEntries: () => eventLog.getEntries(),
    clear: () => eventLog.clear(),
  };
  (window as any).__MF_EVENT_BUS__ = {
    publish: (type: string, payload: unknown, source?: string) => eventBus.publish(type, payload, source),
  };

  function getRemoteOutlet(manifestName: string) {
    if (manifestName === "tools") return shellHost.querySelector("#remote-outlet-tools") as HTMLElement;
    if (manifestName === "records")
      return shellHost.querySelector("#remote-outlet-records") as HTMLElement;
    return null;
  }

  async function mountRemote(manifest: any) {
    const container = getRemoteOutlet(manifest.name);
    if (!container) {
      return;
    }

    const validation = validateRemoteManifest(manifest);
    if (!validation.valid) {
      container.innerHTML = `<p data-testid="manifest-error-${manifest.name}">${validation.errors.join(", ")}</p>`;
      return;
    }

    try {
      const remote = await loadRemoteModule(manifest);
      const api = remote.mount(container, {
        pathname: manifest.routeBase,
        context: {
          ...context,
          taskStats: taskState,
        },
        eventBus,
      });
      cleanupByRemote.set(manifest.name, typeof api?.unmount === "function" ? api.unmount : null);
    } catch (error) {
      renderRemoteFallback(container, manifest.name, error);
      cleanupByRemote.set(manifest.name, null);
    }
  }

  async function mountAllRemotes() {
    for (const cleanup of cleanupByRemote.values()) {
      cleanup?.();
    }
    cleanupByRemote.clear();
    shellStatus().replaceChildren(makeStatus("Mounting both remotes in one shell view", false));
    await Promise.all(manifests.map((manifest: any) => mountRemote(manifest)));
  }

  wireTaskBroker(
    eventBus,
    () => taskState,
    (next) => {
      taskState = next;
    }
  );

  mountAllRemotes();
}
