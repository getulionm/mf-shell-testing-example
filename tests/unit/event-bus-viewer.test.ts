import { createEventBusViewer } from "../../apps/shell/src/eventBusViewer";

describe("event bus viewer", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  function mountViewer() {
    document.body.innerHTML = `
      <section data-testid="event-bus-panel">
        <button type="button" id="clear-event-log-btn">Clear log</button>
        <p data-testid="event-log-empty">Empty</p>
        <ol data-testid="event-log-list"></ol>
      </section>
    `;
    return createEventBusViewer(document.body.querySelector("[data-testid='event-bus-panel']") as HTMLElement, 20);
  }

  it("shows empty state before any events", () => {
    mountViewer();
    expect(document.querySelector("[data-testid='event-log-empty']")).toBeTruthy();
    expect(document.querySelectorAll("[data-testid='event-log-entry']").length).toBe(0);
  });

  it("renders published events with type, source, and payload", () => {
    const viewer = mountViewer();
    viewer.append({
      status: "published",
      type: "TaskCreated",
      source: "task-creator-remote",
      payload: { title: "Plan sprint" },
      at: Date.now(),
    });

    const entry = document.querySelector("[data-testid='event-log-entry']") as HTMLElement;
    expect(entry?.dataset.status).toBe("published");
    expect(entry?.textContent).toContain("TaskCreated");
    expect(entry?.textContent).toContain("task-creator-remote");
    expect(entry?.textContent).toContain("Plan sprint");
  });

  it("renders rejected events with validation errors", () => {
    const viewer = mountViewer();
    viewer.append({
      status: "rejected",
      type: "TaskCreated",
      source: "lab-test",
      payload: { title: "" },
      error: "TaskCreated requires payload.title",
      at: Date.now(),
    });

    const entry = document.querySelector("[data-testid='event-log-entry']") as HTMLElement;
    expect(entry?.dataset.status).toBe("rejected");
    expect(entry?.textContent).toContain("TaskCreated requires payload.title");
  });

  it("keeps only the latest twenty events", () => {
    const viewer = mountViewer();
    for (let index = 0; index < 25; index += 1) {
      viewer.append({
        status: "published",
        type: "TaskCreated",
        source: "test",
        payload: { title: `Task ${index}` },
        at: Date.now() + index,
      });
    }

    expect(viewer.getEntries()).toHaveLength(20);
    expect(document.querySelectorAll("[data-testid='event-log-entry']").length).toBe(20);
    expect(document.body.textContent).toContain("Task 24");
    expect(document.body.textContent).not.toContain("Task 4");
  });
});
