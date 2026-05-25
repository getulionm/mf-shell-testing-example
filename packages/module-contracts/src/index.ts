export const REMOTE_IDS = Object.freeze({
  RECORDS: "records",
  TOOLS: "tools",
});

export const EVENT_TYPES = Object.freeze({
  TASK_CREATED: "TaskCreated",
  TASK_STATS_UPDATED: "TaskStatsUpdated",
});

function isObject(value: unknown) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isBrokeredTask(value: unknown) {
  return (
    isObject(value) &&
    typeof value.title === "string" &&
    value.title.trim().length > 0 &&
    (value.status === "created" || value.status === "done")
  );
}

function isBrokeredTaskList(value: unknown) {
  return Array.isArray(value) && value.every(isBrokeredTask);
}

export function validateRemoteManifest(manifest: any) {
  const errors: string[] = [];
  if (!isObject(manifest)) {
    errors.push("manifest must be an object");
    return { valid: false, errors };
  }

  if (typeof manifest.name !== "string" || manifest.name.length === 0) {
    errors.push("manifest.name must be a non-empty string");
  }
  if (typeof manifest.remoteEntry !== "string" || manifest.remoteEntry.length === 0) {
    errors.push("manifest.remoteEntry must be a non-empty string");
  }
  if (typeof manifest.routeBase !== "string" || !manifest.routeBase.startsWith("/")) {
    errors.push("manifest.routeBase must start with /");
  }
  if (typeof manifest.mountModule !== "string" || manifest.mountModule.length === 0) {
    errors.push("manifest.mountModule must be a non-empty string");
  }
  if (!Array.isArray(manifest.capabilities)) {
    errors.push("manifest.capabilities must be an array");
  }
  if (!Array.isArray(manifest.eventSubscriptions)) {
    errors.push("manifest.eventSubscriptions must be an array");
  }

  return { valid: errors.length === 0, errors };
}

export function validateEventPayload(type: string, payload: any) {
  if (!Object.values(EVENT_TYPES).includes(type)) {
    return { valid: false, error: `unsupported event type: ${type}` };
  }
  if (!isObject(payload)) {
    return { valid: false, error: "payload must be an object" };
  }

  if (
    type === EVENT_TYPES.TASK_CREATED &&
    (typeof payload.title !== "string" || payload.title.trim().length === 0)
  ) {
    return { valid: false, error: "TaskCreated requires payload.title" };
  }
  if (
    type === EVENT_TYPES.TASK_STATS_UPDATED &&
    (typeof payload.total !== "number" ||
      typeof payload.open !== "number" ||
      typeof payload.done !== "number" ||
      !isBrokeredTaskList(payload.tasks))
  ) {
    return {
      valid: false,
      error: "TaskStatsUpdated requires payload.total, payload.open, payload.done, and payload.tasks",
    };
  }

  return { valid: true };
}

export function createEventBus(onTelemetry?: (event: any) => void) {
  const subscribers = new Map();

  function subscribe(type: string, handler: (event: any) => void) {
    if (!subscribers.has(type)) {
      subscribers.set(type, new Set());
    }
    subscribers.get(type).add(handler);
    return () => subscribers.get(type)?.delete(handler);
  }

  function publish(type: string, payload: any, source?: string) {
    const payloadValidation = validateEventPayload(type, payload);
    if (!payloadValidation.valid) {
      const rejection = {
        status: "rejected" as const,
        type,
        payload,
        source: source || "unknown",
        error: payloadValidation.error,
        at: Date.now(),
      };
      onTelemetry?.(rejection);
      throw new Error(payloadValidation.error);
    }
    const event = {
      status: "published" as const,
      type,
      payload,
      source: source || "unknown",
      at: Date.now(),
    };
    onTelemetry?.(event);
    for (const handler of subscribers.get(type) || []) {
      handler(event);
    }
  }

  return { subscribe, publish };
}

export function createShellContext(overrides?: any) {
  return {
    user: "Alex Morgan",
    workspace: "ADMIN",
    tenant: "internal-tools",
    permissions: {
      canCreateTask: true,
    },
    ...overrides,
  };
}
