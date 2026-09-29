import { chromium, type Page } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { setTimeout as delay } from "node:timers/promises";
import assert from "node:assert/strict";
import AxeBuilder from "@axe-core/playwright";
const server = spawn(
  process.execPath,
  [
    "node_modules/vite/bin/vite.js",
    "preview",
    "--host",
    "127.0.0.1",
    "--port",
    "4179",
    "--strictPort",
  ],
  { stdio: "pipe" },
);
const root = "http://127.0.0.1:4179/domain-buyer-assistant/";
mkdirSync("output/playwright", { recursive: true });
const browser = await chromium.launch({ headless: true });
const logs: string[] = [];
async function assertAccessible(page: Page) {
  const accessibility = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  assert.deepEqual(
    accessibility.violations.map((item) => ({
      id: item.id,
      nodes: item.nodes.map((node) => node.target),
    })),
    [],
    "Accessibility violations",
  );
}
try {
  let ready = false;
  for (let count = 0; count < 40; count++) {
    try {
      const response = await fetch(root);
      if (response.ok) {
        ready = true;
        break;
      }
    } catch {
      /* Wait for the local server. */
    }
    await delay(200);
  }
  assert(ready, "Preview server did not become ready");
  for (const mobile of [false, true]) {
    console.log(
      `Checking ${mobile ? "mobile touch" : "desktop mouse"} workflow`,
    );
    const context = await browser.newContext({
      viewport: mobile
        ? { width: 390, height: 844 }
        : { width: 1440, height: 1050 },
      isMobile: mobile,
      hasTouch: mobile,
    });
    const page = await context.newPage();
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    page.on("pageerror", (error) => logs.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") logs.push(message.text());
    });
    await page.goto(root);
    await page.evaluate(() => document.fonts.ready);
    await assertAccessible(page);
    const activate = async (name: string) => {
      const button = page.getByRole("button", { name, exact: true });
      if (mobile) await button.tap();
      else await button.click();
    };
    await activate("Run example research");
    await page
      .getByRole("button", { name: /Cedar & Stone Plumbing/ })
      .waitFor();
    await activate("View sample drafts");
    await page.screenshot({
      path: `output/playwright/drafts-${mobile ? "mobile" : "desktop"}.png`,
      fullPage: true,
    });
    assert(
      (
        await page.getByLabel("Review and edit before outreach").inputValue()
      ).startsWith("Subject:"),
    );
    await page.getByLabel("Sample format").selectOption("contact-form");
    assert(
      (
        await page.getByLabel("Review and edit before outreach").inputValue()
      ).includes("who would be the best person"),
    );
    await page
      .getByLabel("Review and edit before outreach")
      .fill("Edited contact-form example.");
    await page.getByLabel("Sample format").selectOption("short-introduction");
    assert(
      (
        await page.getByLabel("Review and edit before outreach").inputValue()
      ).includes("open to a quick look"),
    );
    await page.getByLabel("Sample format").selectOption("contact-form");
    assert.equal(
      await page.getByLabel("Review and edit before outreach").inputValue(),
      "Edited contact-form example.",
    );
    await page.getByRole("button", { name: "Evidence & fit" }).click();
    await activate("Add to shortlist");
    await activate("Prepare outreach draft");
    await assertAccessible(page);
    await page
      .getByLabel("Review and edit before outreach")
      .fill("Reviewed simulated draft. No message sent.");
    await activate("Copy draft");
    await page.waitForFunction(
      async () =>
        (await navigator.clipboard.readText()) ===
        "Reviewed simulated draft. No message sent.",
    );
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: /Export shortlist/ }).click();
    const artifact = await download;
    const path = await artifact.path();
    assert(path);
    const packet = JSON.parse(readFileSync(path, "utf8"));
    assert.equal(packet.mode, "simulation");
    assert.equal(
      packet.candidates[0].draft,
      "Reviewed simulated draft. No message sent.",
    );
    await page.getByRole("button", { name: "Evidence & fit" }).click();
    await assertAccessible(page);
    await page.screenshot({
      path: `output/playwright/${mobile ? "mobile" : "desktop"}.png`,
      fullPage: true,
    });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      ),
      false,
      "Horizontal overflow",
    );
    await page.getByRole("button", { name: /Held back/ }).click();
    await page.getByRole("button", { name: /Prairie Home Plumbing/ }).click();
    assert(
      await page
        .getByRole("button", { name: "Not eligible for shortlist" })
        .isDisabled(),
    );
    await page.getByLabel("Example scenario").selectOption("empty");
    await activate("Run example research");
    await page
      .getByRole("heading", { name: "No matches in this view" })
      .waitFor();
    await page.getByLabel("Example scenario").selectOption("failure");
    await activate("Run example research");
    await page
      .getByRole("heading", { name: "Research is unavailable" })
      .waitFor();
    await activate("Switch to standard example");
    await activate("Run example research");
    await page
      .getByRole("button", { name: /Cedar & Stone Plumbing/ })
      .waitFor();
    await page
      .getByLabel("Domain", { exact: true })
      .selectOption("branson-vacations");
    await activate("Run example research");
    await page.getByRole("button", { name: /Juniper Lake Stays/ }).waitFor();
    assert.equal(
      await page
        .getByRole("button", { name: /Cedar & Stone Plumbing/ })
        .count(),
      0,
    );
    await page.getByRole("button", { name: "About this demo" }).click();
    assert(await page.getByRole("dialog").isVisible());
    await assertAccessible(page);
    await page.keyboard.press("Escape");
    assert(!(await page.getByRole("dialog").isVisible()));
    await context.close();
  }
  console.log("Checking keyboard-only workflow");
  const page = await browser.newPage();
  await page.goto(root);
  async function keyboardReach(name: string) {
    for (let count = 0; count < 70; count++) {
      await page.keyboard.press("Tab");
      const focus = await page.evaluate(() =>
        document.activeElement instanceof HTMLElement
          ? document.activeElement.innerText
          : "",
      );
      if (focus.replace(/\s+/g, "") === name.replace(/\s+/g, "")) return;
    }
    throw new Error(`Keyboard could not reach ${name}`);
  }
  async function keyboardActivate(name: string) {
    await keyboardReach(name);
    await page.keyboard.press("Enter");
  }
  await keyboardActivate("Run example research");
  await page.getByRole("button", { name: /Cedar & Stone Plumbing/ }).waitFor();
  await keyboardActivate("Add to shortlist");
  await keyboardActivate("Prepare outreach draft");
  assert(await page.getByLabel("Review and edit before outreach").isVisible());
  // Tabs cycle through the editable draft and copy action to export without pointer use.
  await keyboardReach("Export shortlist1");
  await Promise.all([
    page.waitForEvent("download"),
    page.keyboard.press("Enter"),
  ]);
  await page.close();
  assert.deepEqual(logs, [], "Browser errors");
  writeFileSync(
    "output/playwright/smoke-result.json",
    JSON.stringify(
      {
        desktop: "pass",
        mobileTouch: "pass",
        keyboard: "pass",
        export: "pass",
        empty: "pass",
        failureRetry: "pass",
        domainSwitch: "pass",
        browserErrors: logs,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    "PASS: desktop, touch/mobile, keyboard, export, exclusions, empty, retry, domain switch; no browser errors.",
  );
} finally {
  await browser.close();
  server.kill();
}
