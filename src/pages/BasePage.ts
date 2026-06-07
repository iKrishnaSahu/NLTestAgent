import { Browser } from "webdriverio";

/**
 * BasePage — shared utilities for all Page Object Models.
 * All page-specific POMs should extend this class.
 */
export abstract class BasePage {
  protected browser: Browser;

  constructor(browser: Browser) {
    this.browser = browser;
  }

  /**
   * Navigate to a URL, swallowing timeout errors (site is slow).
   */
  async navigate(url: string): Promise<void> {
    try {
      await this.browser.url(url);
    } catch (err: any) {
      console.warn(`[BasePage] Navigation warning (proceeding anyway): ${err.message}`);
    }
  }

  /**
   * Dismiss any modal/overlay by pressing Escape.
   */
  async pressEscape(): Promise<void> {
    await this.browser.keys("Escape");
    await this.browser.pause(300);
  }

  /**
   * Dismiss the EVA chatbot popup that appears on EaseMyTrip.
   */
  async dismissChatbot(): Promise<void> {
    try {
      const selectors = [
        "#imgCro",
        ".close-btn",
        "#close-eva",
        ".close-chat",
        "#chatCloseBtn",
        "button[aria-label='Close']",
        ".chat-close"
      ];
      for (const sel of selectors) {
        const btn = await this.browser.$(sel);
        if (await btn.isExisting() && await btn.isDisplayed()) {
          await btn.click();
          console.log(`[BasePage] Chatbot dismissed via: ${sel}`);
          await this.browser.pause(500);
          return;
        }
      }
    } catch {
      // Non-blocking — chatbot may not be present
    }
  }

  /**
   * Wait for an element and click it safely.
   */
  async safeClick(selector: string, timeout = 10000): Promise<void> {
    const el = await this.browser.$(selector);
    await el.waitForClickable({ timeout });
    await el.click();
  }

  /**
   * Try a list of selectors and return the first one that exists & is displayed.
   */
  async findFirstVisible(selectors: string[]): Promise<any | null> {
    for (const sel of selectors) {
      try {
        const el = await this.browser.$(sel);
        if (await el.isExisting() && await el.isDisplayed()) {
          return el;
        }
      } catch {
        // continue
      }
    }
    return null;
  }
}
