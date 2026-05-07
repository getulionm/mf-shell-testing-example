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

  it("propagates task creation to task summary stats via shell bridge", async () => {
    const recordsContainer = document.createElement("div");
    const toolsContainer = document.createElement("div");
    document.body.append(recordsContainer, toolsContainer);

    const telemetry: any[] = [];
    const bus = createEventBus((event: any) => telemetry.push(event));
    let stats = { total: 0, open: 0, done: 0 };
    wireTaskBroker(
      bus,
      () => stats,
      (next: any) => {
        stats = next;
      }
    );

    mountRecords(recordsContainer, {
      pathname: "/task-summary",
      context: createShellContext({ taskStats: { total: 0, open: 0, done: 0 } }),
      eventBus: bus,
    });
    mountTools(toolsContainer, {
      pathname: "/task-creator",
      context: createShellContext({
        permissions: { canCreateTask: true },
      }),
      eventBus: bus,
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    (toolsContainer.querySelector("#task-title-input") as HTMLInputElement).value = "Plan sprint";
    (toolsContainer.querySelector("#create-task-btn") as HTMLButtonElement).click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const total = recordsContainer.querySelector("[data-testid='summary-total']") as HTMLElement;
    expect(total.textContent).toBe("1");
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
