import { test, expect } from "@playwright/test";

async function createTask(page: any, title: string) {
  await page.getByLabel("Task title").fill(title);
  await page.getByRole("button", { name: "Create Task" }).click();
}

async function ensureRemotesReady(page: any) {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const creatorCount = await page.getByTestId("creator-module").count();
    const summaryCount = await page.getByTestId("summary-module").count();
    if (creatorCount > 0 && summaryCount > 0) {
      return;
    }
    await page.getByRole("button", { name: "Reload remotes" }).click();
    await page.waitForTimeout(500);
  }
}

test.describe("resilience flows", () => {
  test("tools manifestUnavailable isolates failure to creator slot", async ({ page }: any) => {
    await page.goto("/");
    await ensureRemotesReady(page);
    await page.evaluate(() => {
      (window as any).__MF_FAULTS__.setFault("tools", { manifestUnavailable: true });
    });
    await page.getByRole("button", { name: "Reload remotes" }).click();
    await expect(page.getByTestId("module-unavailable-tools")).toBeVisible();
    await expect(page.getByTestId("summary-module")).toBeVisible();
  });

  test("records manifestUnavailable isolates failure to summary slot", async ({ page }: any) => {
    await page.goto("/");
    await ensureRemotesReady(page);
    await page.evaluate(() => {
      (window as any).__MF_FAULTS__.setFault("records", { manifestUnavailable: true });
    });
    await page.getByRole("button", { name: "Reload remotes" }).click();
    await expect(page.getByTestId("module-unavailable-records")).toBeVisible();
    await expect(page.getByTestId("creator-module")).toBeVisible();
    await createTask(page, "Task still creatable");
    await expect(page.getByTestId("creator-last-task")).toContainText("Task still creatable");
  });

  test("tools backendTimeout isolates failure to creator module", async ({ page }: any) => {
    await page.goto("/");
    await ensureRemotesReady(page);
    await page.evaluate(() => {
      (window as any).__MF_FAULTS__.setFault("tools", { backendTimeout: true });
    });
    await page.getByRole("button", { name: "Reload remotes" }).click();
    await createTask(page, "Fail tools timeout");
    await expect(page.getByTestId("creator-error")).toBeVisible();
    await expect(page.getByTestId("summary-module")).toBeVisible();
    await expect(page.getByTestId("summary-total")).toHaveText("0");
  });

  test("records backendTimeout isolates failure to summary module", async ({ page }: any) => {
    await page.goto("/");
    await ensureRemotesReady(page);
    await page.evaluate(() => {
      (window as any).__MF_FAULTS__.setFault("records", { backendTimeout: true });
    });
    await page.getByRole("button", { name: "Reload remotes" }).click();
    await createTask(page, "Fail records timeout");
    await expect(page.getByTestId("summary-error")).toBeVisible();
    await expect(page.getByTestId("creator-module")).toBeVisible();
    await expect(page.getByTestId("creator-last-task")).toContainText("Fail records timeout");
  });

  test("tools backendError isolates failure to creator module", async ({ page }: any) => {
    await page.goto("/");
    await ensureRemotesReady(page);
    await page.evaluate(() => {
      (window as any).__MF_FAULTS__.setFault("tools", { backendError: true });
    });
    await page.getByRole("button", { name: "Reload remotes" }).click();
    await createTask(page, "Fail tools backend error");
    await expect(page.getByTestId("creator-error")).toBeVisible();
    await expect(page.getByTestId("summary-module")).toBeVisible();
    await expect(page.getByTestId("summary-total")).toHaveText("0");
  });

  test("records backendError isolates failure to summary module", async ({ page }: any) => {
    await page.goto("/");
    await ensureRemotesReady(page);
    await page.evaluate(() => {
      (window as any).__MF_FAULTS__.setFault("records", { backendError: true });
    });
    await page.getByRole("button", { name: "Reload remotes" }).click();
    await createTask(page, "Fail records backend error");
    await expect(page.getByTestId("summary-error")).toBeVisible();
    await expect(page.getByTestId("creator-module")).toBeVisible();
  });

  test("tools latencyMs keeps shell responsive and eventually updates summary", async ({ page }: any) => {
    await page.goto("/");
    await ensureRemotesReady(page);
    await page.evaluate(() => {
      (window as any).__MF_FAULTS__.setFault("tools", { latencyMs: 400 });
    });
    await page.getByRole("button", { name: "Reload remotes" }).click();
    await createTask(page, "Tools latency");
    await expect(page.getByTestId("shell-header")).toBeVisible();
    await expect(page.getByTestId("summary-total")).toHaveText("1", { timeout: 8000 });
  });

  test("records latencyMs keeps shell responsive and eventually updates summary", async ({ page }: any) => {
    await page.goto("/");
    await ensureRemotesReady(page);
    await page.evaluate(() => {
      (window as any).__MF_FAULTS__.setFault("records", { latencyMs: 400 });
    });
    await page.getByRole("button", { name: "Reload remotes" }).click();
    await createTask(page, "Records latency");
    await expect(page.getByTestId("creator-module")).toBeVisible();
    await expect(page.getByTestId("summary-total")).toHaveText("1", { timeout: 8000 });
  });
});
