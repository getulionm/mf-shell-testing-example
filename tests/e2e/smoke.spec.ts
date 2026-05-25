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
  test("@smoke learning manual links to github docs", async ({ page }: any) => {
    await page.goto("/");
    await expect(page.getByTestId("learning-manual")).toBeVisible();

    const learningIndexLink = page.getByRole("link", { name: "Learning index" });
    await expect(learningIndexLink).toHaveAttribute(
      "href",
      "https://github.com/getulionm/mf-shell-testing-example/blob/master/README.md"
    );
  });

  test("@smoke shell boots with both remotes in one view", async ({ page }: any) => {
    await page.goto("/");
    await expect(page.getByTestId("learning-manual")).toBeVisible();
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
    await expect(page.getByTestId("summary-task-list")).toContainText("Write onboarding notes");
  });

  test("@smoke event bus viewer logs brokered flow", async ({ page }: any) => {
    await page.goto("/");
    await ensureRemotesReady(page);
    await expect(page.getByTestId("event-bus-panel")).toBeVisible();

    await page.getByLabel("Task title").fill("Trace this task");
    await page.getByRole("button", { name: "Create Task" }).click();

    const publishedEntries = page.locator('[data-testid="event-log-entry"][data-status="published"]');
    await expect(publishedEntries).toHaveCount(2);
    await expect(publishedEntries.nth(0)).toContainText("TaskStatsUpdated");
    await expect(publishedEntries.nth(0)).toContainText("shell");
    await expect(publishedEntries.nth(1)).toContainText("TaskCreated");
    await expect(publishedEntries.nth(1)).toContainText("task-creator-remote");
  });

  test("@smoke event bus viewer logs validation failures", async ({ page }: any) => {
    await page.goto("/");
    await ensureRemotesReady(page);

    await page.evaluate(() => {
      try {
        (window as any).__MF_EVENT_BUS__.publish("TaskCreated", { title: "" }, "e2e-test");
      } catch {
        // expected validation failure
      }
    });

    const rejectedEntry = page.locator('[data-testid="event-log-entry"][data-status="rejected"]').first();
    await expect(rejectedEntry).toBeVisible();
    await expect(rejectedEntry).toContainText("TaskCreated");
    await expect(rejectedEntry).toContainText("e2e-test");
    await expect(rejectedEntry).toContainText("title");
  });
});
