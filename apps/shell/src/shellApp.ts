import {
  createEventBus,
  createShellContext,
  validateRemoteManifest,
  EVENT_TYPES,
} from "@mf/module-contracts";
import { shouldFailManifest, setFault, resetFaults } from "@mf/fault-toggles";
import { manifests } from "./manifests";

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
  root: HTMLElement,
  context: any,
  onWorkspaceChange: (workspace: string) => void,
  onReloadRemotes: () => void
) {
  root.classList.add("shell-boundary");
  root.innerHTML = `
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
    <div class="layout">
      <aside class="side-nav" data-testid="nav-drawer">
        <p class="nav-hint">
          This app tests shell orchestration boundaries, not remote internals.
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
  `;

  const select = root.querySelector("#workspace-select") as HTMLSelectElement;
  select.value = context.workspace;
  select.addEventListener("change", (event) =>
    onWorkspaceChange((event.target as HTMLSelectElement).value)
  );
  root.querySelector("#reload-remotes-btn")?.addEventListener("click", onReloadRemotes);
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

export function wireTaskBroker(eventBus: any, readStats: () => any, writeStats: (next: any) => void) {
  return eventBus.subscribe(EVENT_TYPES.TASK_CREATED, () => {
    const current = readStats();
    const next = {
      total: current.total + 1,
      open: current.open + 1,
      done: current.done,
    };
    writeStats(next);
    eventBus.publish(EVENT_TYPES.TASK_STATS_UPDATED, { ...next }, "shell");
  });
}

export function bootstrapShell(root: HTMLElement) {
  let context = createShellContext();
  let taskStats = { total: 0, open: 0, done: 0 };
  const cleanupByRemote = new Map();
  const shellStatus = () => root.querySelector("#shell-status") as HTMLElement;

  const eventBus = createEventBus((event: any) => {
    const telemetry = document.createElement("div");
    telemetry.setAttribute("data-testid", "shell-telemetry");
    telemetry.textContent = `${event.type}:${event.source}`;
    shellStatus().replaceChildren(makeStatus("Telemetry captured", false), telemetry);
  });

  (window as any).__MF_FAULTS__ = { setFault, resetFaults };

  function getRemoteOutlet(manifestName: string) {
    if (manifestName === "tools") return root.querySelector("#remote-outlet-tools") as HTMLElement;
    if (manifestName === "records")
      return root.querySelector("#remote-outlet-records") as HTMLElement;
    return null;
  }

  function renderRemoteFallback(container: HTMLElement, manifestName: string, error: unknown) {
    const fallback = document.createElement("div");
    fallback.className = "module-unavailable";
    fallback.setAttribute("data-testid", `module-unavailable-${manifestName}`);
    fallback.innerHTML = `
      <h3>Module unavailable</h3>
      <p>Remote <strong>${manifestName}</strong> could not load.</p>
      <p>${String((error as any).message || error)}</p>
    `;
    container.replaceChildren(fallback);
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
          taskStats,
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

  renderShellChrome(
    root,
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

  wireTaskBroker(
    eventBus,
    () => taskStats,
    (next) => {
      taskStats = next;
    }
  );

  mountAllRemotes();
}
