import { validateRemoteManifest } from "@mf/module-contracts";
import { manifests } from "../../apps/shell/src/manifests";
import * as recordsRemote from "../../apps/records-remote/src/mount";
import * as toolsRemote from "../../apps/tools-remote/src/mount";

describe("remote contracts", () => {
  it("keeps all shell manifests valid", () => {
    const results = manifests.map((manifest: any) => validateRemoteManifest(manifest));
    expect(results.every((result: any) => result.valid)).toBe(true);
  });

  it("ensures remotes export mount API", () => {
    expect(typeof recordsRemote.mount).toBe("function");
    expect(typeof toolsRemote.mount).toBe("function");
  });
});
