import { EVENT_TYPES } from "@mf/module-contracts";
import { runWithBackendFault } from "@mf/fault-toggles";

type ShellTask = { title: string; status: "created" | "done" };

export function mount(container: HTMLElement, shellApi: any) {
  const { eventBus, context } = shellApi;
  let stats = {
    total: Number(context.taskStats?.total || 0),
    open: Number(context.taskStats?.open || 0),
    done: Number(context.taskStats?.done || 0),
  };
  let tasks: ShellTask[] = Array.isArray(context.taskStats?.tasks) ? [...context.taskStats.tasks] : [];
  let unsubTaskStatsUpdated = () => {};

  function renderTaskRows() {
    if (tasks.length === 0) {
      return `<li data-testid="summary-empty">No tasks from shell yet.</li>`;
    }

    return tasks
      .map(
        (task) => `
          <li data-testid="summary-task-row">
            <span data-testid="summary-task-title">${task.title}</span>
            <span data-testid="summary-task-status">${task.status}</span>
          </li>
        `
      )
      .join("");
  }

  function renderSummary() {
    container.innerHTML = `
      <section data-testid="summary-module" class="remote-boundary remote-boundary-records">
        <h1>Task Summary</h1>
        <p>Team B remote displays tasks sent by the shell.</p>
        <ul class="summary-list">
          <li>Total tasks: <strong data-testid="summary-total">${stats.total}</strong></li>
          <li>Created tasks: <strong data-testid="summary-open">${stats.open}</strong></li>
          <li>Done tasks: <strong data-testid="summary-done">${stats.done}</strong></li>
        </ul>
        <h2 class="summary-subtitle">Tasks from shell</h2>
        <ul class="summary-task-list" data-testid="summary-task-list">
          ${renderTaskRows()}
        </ul>
      </section>
    `;
  }

  function applyBrokeredState(payload: any) {
    stats = {
      total: payload.total,
      open: payload.open,
      done: payload.done,
    };
    tasks = Array.isArray(payload.tasks) ? payload.tasks.map((task: ShellTask) => ({ ...task })) : [];
  }

  runWithBackendFault("records", () => true)
    .then(() => renderSummary())
    .catch((error: any) => {
      container.innerHTML = `<p data-testid="summary-error">Task Summary unavailable: ${error.message}</p>`;
    });

  unsubTaskStatsUpdated = eventBus.subscribe(EVENT_TYPES.TASK_STATS_UPDATED, (event: any) => {
    applyBrokeredState(event.payload);
    runWithBackendFault("records", () => true)
      .then(() => renderSummary())
      .catch((error: any) => {
        container.innerHTML = `<p data-testid="summary-error">Task Summary unavailable: ${error.message}</p>`;
      });
  });

  return {
    unmount() {
      unsubTaskStatsUpdated();
      container.innerHTML = "";
    },
  };
}
