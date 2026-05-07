import {
  setFault,
  getFault,
  resetFaults,
  shouldFailManifest,
  runWithBackendFault,
} from "@mf/fault-toggles";

describe("fault toggles", () => {
  beforeEach(() => resetFaults());

  it("exposes manifest failure state", () => {
    setFault("tools", { manifestUnavailable: true });
    expect(shouldFailManifest("tools")).toBe(true);
  });

  it("throws on backend timeout faults", async () => {
    setFault("records", { backendTimeout: true });
    await expect(runWithBackendFault("records", () => "ok")).rejects.toThrow("timeout");
  });

  it("executes operation with no faults", async () => {
    const result = await runWithBackendFault("records", () => "ok");
    expect(result).toBe("ok");
    expect(getFault("records").backendError).toBe(false);
  });
});
