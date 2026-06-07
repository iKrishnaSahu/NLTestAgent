import { BasePage } from "./BasePage";

/**
 * FlightResultsPage — Page Object Model for the EaseMyTrip flight search results page.
 *
 * Handles:
 *  - Verifying that the results page has loaded
 *  - Extracting basic flight listing info
 */
export class FlightResultsPage extends BasePage {
  // ── Locators ────────────────────────────────────────────────────────────────

  /** Main flight listing container (multiple selector variants) */
  get flightListContainer() {
    return this.browser.$(".flight-list, .flt-list, .result-col, #fltListingContainer, .flightList");
  }

  /** Individual flight result cards */
  get flightCards() {
    return this.browser.$$(".flt-i-sec, .flight-row, .result-item, .fli-det");
  }

  // ── Actions ──────────────────────────────────────────────────────────────────

  /**
   * Wait for the results page to be loaded.
   * Polls URL and DOM presence for up to ~15 seconds.
   */
  async waitForResultsLoaded(maxRetries = 5, delayMs = 3000): Promise<boolean> {
    for (let i = 0; i < maxRetries; i++) {
      const currentUrl = await this.browser.getUrl();
      const urlMatches =
        currentUrl.includes("/flightlist/") ||
        currentUrl.includes("/flight-list/") ||
        currentUrl.includes("/flight-search/");

      const containerExists = await this.flightListContainer.isExisting().catch(() => false);

      if (urlMatches || containerExists) {
        console.log(`[FlightResultsPage] Results page loaded. URL: ${currentUrl}`);
        return true;
      }

      console.log(`[FlightResultsPage] Waiting for results... attempt ${i + 1}/${maxRetries}`);
      await this.browser.pause(delayMs);
    }

    return false;
  }

  /**
   * Returns the current page URL.
   */
  async getCurrentUrl(): Promise<string> {
    return this.browser.getUrl();
  }

  /**
   * Returns the count of flight result cards visible on the page.
   */
  async getFlightCount(): Promise<number> {
    // Use the getter directly — do not assign to intermediate variable
    // (ChainablePromiseArray must be awaited via the getter, not a re-reference)
    return (await this.flightCards).length;
  }
}
