import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "recordsRemote/mount": "/tests/mocks/federatedRemoteMount.ts",
      "toolsRemote/mount": "/tests/mocks/federatedRemoteMount.ts",
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    include: ["tests/**/*.test.ts"],
    clearMocks: true,
  },
});
