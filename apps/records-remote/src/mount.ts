import { EVENT_TYPES } from "@mf/module-contracts";
import { runWithBackendFault } from "@mf/fault-toggles";

export function mount(container: HTMLElement, shellApi: any) {
  const { eventBus, context } = shellApi;
  let stats = {
    total: Number(context.taskStats?.total || 0),
    open: Number(context.taskStats?.open || 0),
    done: Number(context.taskStats?.done || 0),
  };
  let unsubTaskStatsUpdated = () => {};

  function renderSummary() {
    container.innerHTML = `
      <section data-testid="summary-module" class="remote-boundary remote-boundary-records">
        <h1>Task Summary</h1>
        <p>Team B remote only reads shell-brokered stats updates.</p>
        <ul class="summary-list">
          <li>Total tasks: <strong data-testid="summary-total">${stats.total}</strong></li>
          <li>Open tasks: <strong data-testid="summary-open">${stats.open}</strong></li>
          <li>Done tasks: <strong data-testid="summary-done">${stats.done}</strong></li>
        </ul>
      </section>
    `;
  }

  runWithBackendFault("records", () => true)
    .then(() => renderSummary())
    .catch((error: any) => {
      container.innerHTML = `<p data-testid="summary-error">Task Summary unavailable: ${error.message}</p>`;
    });

  unsubTaskStatsUpdated = eventBus.subscribe(EVENT_TYPES.TASK_STATS_UPDATED, (event: any) => {
    stats = {
      total: event.payload.total,
      open: event.payload.open,
      done: event.payload.done,
    };
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
