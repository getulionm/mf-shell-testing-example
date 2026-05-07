import {
  EVENT_TYPES,
  createEventBus,
  validateRemoteManifest,
  validateEventPayload,
} from "@mf/module-contracts";

describe("module contracts", () => {
  it("validates a correct remote manifest", () => {
    const result = validateRemoteManifest({
      name: "records",
      remoteEntry: "http://localhost:3001/remoteEntry.js",
      routeBase: "/task-summary",
      mountModule: "records/mount",
      capabilities: [],
      eventSubscriptions: [],
    });
    expect(result.valid).toBe(true);
  });

  it("rejects malformed task event payload", () => {
    const result = validateEventPayload(EVENT_TYPES.TASK_CREATED, { nope: "x" });
    expect(result.valid).toBe(false);
  });

  it("accepts valid task created payload", () => {
    const result = validateEventPayload(EVENT_TYPES.TASK_CREATED, {
      title: "Write docs",
    });
    expect(result.valid).toBe(true);
  });

  it("rejects empty task title", () => {
    const result = validateEventPayload(EVENT_TYPES.TASK_CREATED, { title: "" });
    expect(result.valid).toBe(false);
  });

  it("rejects non-string task title", () => {
    const result = validateEventPayload(EVENT_TYPES.TASK_CREATED, { title: 123 });
    expect(result.valid).toBe(false);
  });

  it("rejects incomplete task stats payload", () => {
    const result = validateEventPayload(EVENT_TYPES.TASK_STATS_UPDATED, { total: 1, open: 1 });
    expect(result.valid).toBe(false);
  });

  it("rejects unsupported event type", () => {
    const result = validateEventPayload("NopeEvent", { any: "value" });
    expect(result.valid).toBe(false);
  });

  it("publishes and delivers typed events", () => {
    const seen = [];
    const bus = createEventBus((event) => seen.push(event.type));
    let payload = "";

    bus.subscribe(EVENT_TYPES.TASK_STATS_UPDATED, (event) => {
      payload = String(event.payload.total);
    });
    bus.publish(EVENT_TYPES.TASK_STATS_UPDATED, { total: 1, open: 1, done: 0 }, "test");

    expect(seen).toEqual([EVENT_TYPES.TASK_STATS_UPDATED]);
    expect(payload).toBe("1");
  });
});
