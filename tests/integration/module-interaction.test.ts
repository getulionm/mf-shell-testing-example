import { createEventBus, EVENT_TYPES, createShellContext } from "@mf/module-contracts";
import { resetFaults, setFault } from "@mf/fault-toggles";
import { mount as mountTools } from "../../apps/tools-remote/src/mount";
import { mount as mountRecords } from "../../apps/records-remote/src/mount";
import { wireTaskBroker } from "../../apps/shell/src/shellApp";

describe("module integration", () => {
  beforeEach(() => {
    resetFaults();
    document.body.innerHTML = "";
  });

  function setupHarness() {
    const recordsContainer = document.createElement("div");
    const toolsContainer = document.createElement("div");
    document.body.append(recordsContainer, toolsContainer);

    const telemetry: any[] = [];
    const bus = createEventBus((event: any) => telemetry.push(event));
    let taskState = { total: 0, open: 0, done: 0, tasks: [] as Array<{ title: string; status: "created" | "done" }> };
    wireTaskBroker(
      bus,
      () => taskState,
      (next: any) => {
        taskState = next;
      }
    );

    mountRecords(recordsContainer, {
      pathname: "/task-summary",
      context: createShellContext({ taskStats: { total: 0, open: 0, done: 0, tasks: [] } }),
      eventBus: bus,
    });
    mountTools(toolsContainer, {
      pathname: "/task-creator",
      context: createShellContext({
        permissions: { canCreateTask: true },
      }),
      eventBus: bus,
    });

    return { recordsContainer, toolsContainer, telemetry, bus };
  }

  it("propagates task creation to task summary stats via shell bridge", async () => {
    const { recordsContainer, toolsContainer, telemetry } = setupHarness();

    await new Promise((resolve) => setTimeout(resolve, 0));

    (toolsContainer.querySelector("#task-title-input") as HTMLInputElement).value = "Plan sprint";
    (toolsContainer.querySelector("#create-task-btn") as HTMLButtonElement).click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const total = recordsContainer.querySelector("[data-testid='summary-total']") as HTMLElement;
    expect(total.textContent).toBe("1");
    expect(recordsContainer.textContent).toContain("Plan sprint");
    expect(recordsContainer.textContent).toContain("created");
    expect(
      telemetry.some(
        (event) => event.type === EVENT_TYPES.TASK_STATS_UPDATED && event.source === "shell"
      )
    ).toBe(true);
  });

  it("renders records outage message without crashing", async () => {
    const recordsContainer = document.createElement("div");
    document.body.append(recordsContainer);

    setFault("records", { backendTimeout: true });
    mountRecords(recordsContainer, {
      pathname: "/task-summary",
      context: createShellContext(),
      eventBus: createEventBus(),
    });

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(recordsContainer.textContent).toContain("Task Summary unavailable");
  });
});
