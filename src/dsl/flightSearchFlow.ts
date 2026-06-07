import fs from "fs";
import path from "path";
import { createBrowser } from "../browser/browserFactory.js";
import { EaseMyTripHomePage } from "../pages/EaseMyTripHomePage.js";
import { FlightResultsPage } from "../pages/FlightResultsPage.js";

export interface WorkflowResult {
  status: "PASSED" | "FAILED";
  summary: string;
  details?: {
    steps: Array<{ name: string; status: "PASSED" | "FAILED"; error?: string }>;
    screenshotPath?: string;
  };
}

/**
 * validateFlightSearchFlow
 *
 * Automates EaseMyTrip flight search validation using WebdriverIO.
 * Uses Page Object Model (POM) classes for clean separation of concerns.
 *
 * Steps:
 *  1. Open EaseMyTrip home page
 *  2. Select origin city (Pune)
 *  3. Select destination city (Delhi)
 *  4. Select a future travel date (+10 days)
 *  5. Click Search
 *  6. Verify the flight results page loads
 *
 * Browser is created via browserFactory — do NOT inline remote() here.
 */
export async function validateFlightSearchFlow(): Promise<WorkflowResult> {
  const stepsReport: Array<{ name: string; status: "PASSED" | "FAILED"; error?: string }> = [];

  const addStep = (name: string, status: "PASSED" | "FAILED", error?: string) => {
    stepsReport.push({ name, status, error });
  };

  console.log("[Flight DSL] Initializing WebdriverIO browser session for EaseMyTrip...");
  const browser = await createBrowser();

  let screenshotPath: string | undefined;

  const homePage = new EaseMyTripHomePage(browser);
  const resultsPage = new FlightResultsPage(browser);

  try {
    console.log("[Flight DSL] Setting page load timeout to 30 seconds...");
    await browser.setTimeout({ pageLoad: 30000 });

    // ── Step 1: Open website ─────────────────────────────────────────────────
    console.log("[Flight DSL] Step 1: Opening EaseMyTrip website...");
    await homePage.open();
    await homePage.ensureFlightsTabSelected();
    addStep("Open website", "PASSED");

    // ── Step 2: Select origin (Pune) ─────────────────────────────────────────
    console.log("[Flight DSL] Step 2: Selecting source city (Pune)...");
    await homePage.selectOrigin("Pune");
    addStep("Source selection (Pune)", "PASSED");

    // ── Step 3: Select destination (Delhi) ───────────────────────────────────
    console.log("[Flight DSL] Step 3: Selecting destination city (Delhi)...");
    await homePage.selectDestination("Delhi");
    addStep("Destination selection (Delhi)", "PASSED");

    // ── Step 4: Select travel date (+10 days) ────────────────────────────────
    console.log("[Flight DSL] Step 4: Selecting travel date (+10 days)...");
    await homePage.selectTravelDate(10);
    addStep("Future travel date selection", "PASSED");

    // ── Step 5: Click Search ──────────────────────────────────────────────────
    console.log("[Flight DSL] Step 5: Clicking search button...");
    await homePage.clickSearch();
    addStep("Search execution", "PASSED");

    // ── Step 6: Validate results page ────────────────────────────────────────
    console.log("[Flight DSL] Step 6: Validating flight results page load...");
    const loaded = await resultsPage.waitForResultsLoaded();

    if (loaded) {
      console.log("[Flight DSL] Flight Search Results page verified successfully!");
      addStep("Results page validation", "PASSED");
      return {
        status: "PASSED",
        summary: "Flight search workflow executed successfully.",
        details: { steps: stepsReport },
      };
    } else {
      const finalUrl = await resultsPage.getCurrentUrl();
      throw new Error(`Results page did not load. Final URL: ${finalUrl}`);
    }
  } catch (error: any) {
    console.error("[Flight DSL] Error running EaseMyTrip flight search workflow:", error);
    addStep("Results page validation", "FAILED", error.message || String(error));

    try {
      const screenshotDir = path.join(__dirname, "../../screenshots");
      if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });
      screenshotPath = path.join(screenshotDir, `failure-flight-${Date.now()}.png`);
      await browser.saveScreenshot(screenshotPath);
      console.log(`[Flight DSL] Saved failure screenshot to: ${screenshotPath}`);
    } catch (ssErr) {
      console.error("[Flight DSL] Could not capture screenshot:", ssErr);
    }

    return {
      status: "FAILED",
      summary: `Flight search workflow failed because ${error.message || error}.`,
      details: { steps: stepsReport, screenshotPath },
    };
  } finally {
    console.log("[Flight DSL] Closing browser session...");
    await browser.deleteSession();
  }
}
