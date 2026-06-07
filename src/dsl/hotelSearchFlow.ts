import fs from "fs";
import path from "path";
import { WorkflowResult } from "./flightSearchFlow";
import { createBrowser } from "../browser/browserFactory";
import { EaseMyTripHotelsPage } from "../pages/EaseMyTripHotelsPage";
import { HotelResultsPage } from "../pages/HotelResultsPage";

/**
 * validateHotelSearchFlow
 *
 * Automates EaseMyTrip hotel search validation using WebdriverIO.
 * Uses Page Object Model (POM) classes for clean separation of concerns.
 *
 * Steps:
 *  1. Open EaseMyTrip Hotels page
 *  2. Select city (Mumbai)
 *  3. Select check-in date (+5 days) and check-out date (+7 days)
 *  4. Click Search
 *  5. Verify the hotel results page loads via HotelResultsPage POM
 *
 * Browser is created via browserFactory — do NOT inline remote() here.
 */
export async function validateHotelSearchFlow(): Promise<WorkflowResult> {
  const stepsReport: Array<{ name: string; status: "PASSED" | "FAILED"; error?: string }> = [];

  const addStep = (name: string, status: "PASSED" | "FAILED", error?: string) => {
    stepsReport.push({ name, status, error });
  };

  console.log("[Hotel DSL] Initializing WebdriverIO browser session for EaseMyTrip...");
  const browser = await createBrowser();

  let screenshotPath: string | undefined;

  const hotelsPage = new EaseMyTripHotelsPage(browser);
  const resultsPage = new HotelResultsPage(browser);

  try {
    console.log("[Hotel DSL] Setting page load timeout to 30 seconds...");
    await browser.setTimeout({ pageLoad: 30000 });

    // ── Step 1: Open Hotels page ──────────────────────────────────────────────
    console.log("[Hotel DSL] Step 1: Opening EaseMyTrip Hotels website...");
    await hotelsPage.open();
    addStep("Open website", "PASSED");

    // ── Step 2: Select city (Mumbai) ──────────────────────────────────────────
    console.log("[Hotel DSL] Step 2: Selecting city (Mumbai)...");
    await hotelsPage.selectCity("Mumbai");
    addStep("City selection (Mumbai)", "PASSED");

    // ── Step 3: Check-in / Check-out dates ────────────────────────────────────
    console.log("[Hotel DSL] Step 3: Selecting check-in/out dates...");
    await hotelsPage.selectCheckInDate(5);
    await hotelsPage.selectCheckOutDate(7);
    addStep("Check-in/out date selection", "PASSED");

    // ── Step 4: Click Search ──────────────────────────────────────────────────
    console.log("[Hotel DSL] Step 4: Clicking search button...");
    await hotelsPage.clickSearch();
    addStep("Search execution", "PASSED");

    // ── Step 5: Validate results page (via HotelResultsPage POM) ─────────────
    console.log("[Hotel DSL] Step 5: Validating hotel results page load...");
    const loaded = await resultsPage.waitForResultsLoaded();

    if (loaded) {
      console.log("[Hotel DSL] Hotel Search Results page verified successfully!");
      addStep("Results page validation", "PASSED");
      return {
        status: "PASSED",
        summary: "Hotel search workflow executed successfully.",
        details: { steps: stepsReport },
      };
    } else {
      const finalUrl = await resultsPage.getCurrentUrl();
      throw new Error(`Results page did not load. Final URL: ${finalUrl}`);
    }
  } catch (error: any) {
    console.error("[Hotel DSL] Hotel search workflow failed:", error);
    addStep("Results page validation", "FAILED", error.message || String(error));

    try {
      const screenshotDir = path.join(__dirname, "../../screenshots");
      if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });
      screenshotPath = path.join(screenshotDir, `failure-hotel-${Date.now()}.png`);
      await browser.saveScreenshot(screenshotPath);
      console.log(`[Hotel DSL] Saved failure screenshot to: ${screenshotPath}`);
    } catch (ssErr) {
      console.error("[Hotel DSL] Could not capture screenshot:", ssErr);
    }

    return {
      status: "FAILED",
      summary: `Hotel search workflow failed because ${error.message || error}.`,
      details: { steps: stepsReport, screenshotPath },
    };
  } finally {
    console.log("[Hotel DSL] Closing browser session...");
    await browser.deleteSession();
  }
}
