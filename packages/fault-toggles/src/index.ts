const defaults = () => ({
  manifestUnavailable: false,
  latencyMs: 0,
  backendTimeout: false,
  backendError: false,
});

const state: Record<string, ReturnType<typeof defaults>> = {
  records: defaults(),
  tools: defaults(),
};

export function resetFaults() {
  for (const key of Object.keys(state)) {
    state[key] = defaults();
  }
}

export function setFault(remoteName: string, patch: Partial<ReturnType<typeof defaults>>) {
  if (!state[remoteName]) {
    throw new Error(`Unknown remote for fault toggle: ${remoteName}`);
  }
  state[remoteName] = { ...state[remoteName], ...patch };
}

export function getFault(remoteName: string) {
  if (!state[remoteName]) {
    throw new Error(`Unknown remote for fault toggle: ${remoteName}`);
  }
  return { ...state[remoteName] };
}

export function shouldFailManifest(remoteName: string) {
  return Boolean(getFault(remoteName).manifestUnavailable);
}

async function delay(ms: number) {
  if (!ms) return;
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runWithBackendFault(remoteName: string, operation: () => any) {
  const fault = getFault(remoteName);
  await delay(fault.latencyMs);
  if (fault.backendTimeout) {
    throw new Error(`${remoteName} backend timeout`);
  }
  if (fault.backendError) {
    throw new Error(`${remoteName} backend error`);
  }
  return operation();
}
