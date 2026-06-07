import { BasePage } from "./BasePage";

/**
 * HotelResultsPage — Page Object Model for the EaseMyTrip hotel search results page.
 *
 * Handles:
 *  - Verifying that the results page has loaded
 *  - URL pattern matching for current EaseMyTrip hotel URL schemes
 *
 * Known EaseMyTrip hotel results URL patterns (as of June 2026):
 *  - /hotel-new/search?cin=...     ← current pattern
 *  - /hotel/hotel-list/...         ← legacy pattern
 *  - /hotel-search/...             ← alternate legacy pattern
 */
export class HotelResultsPage extends BasePage {
  // ── Locators ────────────────────────────────────────────────────────────────

  /** Hotel listing container — multiple selector variants for resilience */
  get hotelListContainer() {
    return this.browser.$(
      ".hotel-list, .htl-list, #hotelListingContainer, .hotelCard, .htl-card"
    );
  }

  // ── Actions ──────────────────────────────────────────────────────────────────

  /**
   * Wait for the hotel results page to load.
   * Polls both the URL and the DOM for up to maxRetries * delayMs ms.
   *
   * Accepted URL patterns:
   *  - /hotel-new/search  (current EaseMyTrip pattern)
   *  - /hotel/hotel-list  (legacy)
   *  - /hotel-search      (legacy)
   *  - cin=               (query param signal — date always present on results)
   */
  async waitForResultsLoaded(maxRetries = 5, delayMs = 3000): Promise<boolean> {
    for (let i = 0; i < maxRetries; i++) {
      const currentUrl = await this.browser.getUrl();

      const urlMatches =
        currentUrl.includes("/hotel-new/search") ||
        currentUrl.includes("/hotel/hotel-list") ||
        currentUrl.includes("/hotel-search") ||
        currentUrl.includes("cin=");

      const containerExists = await this.hotelListContainer
        .isExisting()
        .catch(() => false);

      if (urlMatches || containerExists) {
        console.log(`[HotelResultsPage] Results page loaded. URL: ${currentUrl}`);
        return true;
      }

      console.log(
        `[HotelResultsPage] Waiting for results... attempt ${i + 1}/${maxRetries}`
      );
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
}
