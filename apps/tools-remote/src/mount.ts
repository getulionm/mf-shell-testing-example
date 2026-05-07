import { EVENT_TYPES } from "@mf/module-contracts";
import { runWithBackendFault } from "@mf/fault-toggles";

export function mount(container: HTMLElement, shellApi: any) {
  const { context, eventBus } = shellApi;
  const createdTitles: string[] = [];

  function render(lastCreatedLabel: string) {
    const canCreate = context.workspace === "ADMIN" && context.permissions?.canCreateTask;
    container.innerHTML = `
      <section data-testid="creator-module" class="remote-boundary remote-boundary-tools">
        <h1>Task Creator</h1>
        <p data-testid="creator-workspace">Workspace: ${context.workspace}</p>
        <p>Create tasks in Team A remote. Shell will broker summary updates to Team B remote.</p>
        <p>
          <input aria-label="Task title" id="task-title-input" placeholder="Write a task title" />
          <button id="create-task-btn" type="button">Create Task</button>
        </p>
        <p data-testid="creator-last-task">Last created: ${lastCreatedLabel || "none yet"}</p>
        <p data-testid="creator-total-created">Tasks created in this remote: ${createdTitles.length}</p>
        ${
          canCreate
            ? ""
            : '<p data-testid="creator-edit-locked">Task creation is disabled for USER workspace.</p>'
        }
      </section>
    `;

    if (canCreate) {
      container.querySelector("#create-task-btn")?.addEventListener("click", async () => {
        const input = container.querySelector("#task-title-input") as HTMLInputElement;
        const title = input.value.trim();
        if (!title) {
          return;
        }
        try {
          const created = await runWithBackendFault("tools", () => ({ title }));
          createdTitles.push(created.title);
          eventBus.publish(EVENT_TYPES.TASK_CREATED, { title: created.title }, "task-creator-remote");
          render(created.title);
        } catch (error: any) {
          container.innerHTML = `<p data-testid="creator-error">Task Creator unavailable: ${error.message}</p>`;
        }
      });
    }
  }

  render("");

  return {
    unmount() {
      container.innerHTML = "";
    },
  };
}
