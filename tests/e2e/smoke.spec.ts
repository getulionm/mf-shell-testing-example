import { test, expect } from "@playwright/test";

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
  await expect(page.getByTestId("creator-module")).toBeVisible();
  await expect(page.getByTestId("summary-module")).toBeVisible();
}

test.describe("shell smoke", () => {
  test("@smoke shell boots with both remotes in one view", async ({ page }: any) => {
    await page.goto("/");
    await expect(page.getByTestId("shell-header")).toBeVisible();
    await ensureRemotesReady(page);
    await expect(page.getByTestId("creator-module")).toBeVisible();
    await expect(page.getByTestId("summary-module")).toBeVisible();
    await expect(page.getByTestId("topology-host")).toContainText("Host under test");
    await expect(page.getByTestId("topology-remote-a")).toContainText("Remote A");
    await expect(page.getByTestId("topology-remote-b")).toContainText("Remote B");
  });

  test("@smoke task creation updates summary via shell broker", async ({ page }: any) => {
    await page.goto("/");
    await ensureRemotesReady(page);
    await expect(page.getByTestId("summary-total")).toHaveText("0");
    await page.getByLabel("Task title").fill("Write onboarding notes");
    await page.getByRole("button", { name: "Create Task" }).click();
    await expect(page.getByTestId("summary-total")).toHaveText("1");
    await expect(page.getByTestId("summary-open")).toHaveText("1");
  });
});
