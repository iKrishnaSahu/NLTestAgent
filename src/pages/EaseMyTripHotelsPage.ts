import { BasePage } from "./BasePage";

/**
 * EaseMyTripHotelsPage — Page Object Model for the EaseMyTrip hotel search page.
 *
 * DOM structure (verified June 2026 via debug inspection):
 *
 *  CITY FIELD:
 *   - Visible trigger:   div.hp_inputBox.selectHtlCity  (display: block, clickable)
 *   - Hidden input:      input#txtCity                  (display: none → becomes visible after click)
 *   - Current city:      span.hp_city                   (shows pre-selected city like "Bangalore")
 *   - Autocomplete:      div#divTopCity (top cities) or custom list
 *
 *  DATE FIELDS (both use jQuery UI datepicker):
 *   - Check-in trigger:  div#htl_dates                  (visible display)
 *   - Check-in hidden:   input#txtCheckInDate            (actual input, hidden)
 *   - Check-out trigger: div#htl_dates1                 (visible display)
 *   - Check-out hidden:  input#txtCheckOutDate           (actual input, hidden)
 *   - Datepicker popup:  div#ui-datepicker-div           (jQuery UI, standard <a> tags for days)
 *
 *  SEARCH BUTTON:
 *   - input#btnSearch  (type="button", always visible)
 */
export class EaseMyTripHotelsPage extends BasePage {
  readonly url = "https://www.easemytrip.com/hotels/";

  // ── Locators ────────────────────────────────────────────────────────────────

  /** Visible city selector trigger (click to open the city input) */
  get cityTrigger() {
    return this.browser.$(".hp_inputBox.selectHtlCity, .selectHtlCity");
  }

  /** Hidden city text input (becomes interactive after clicking the trigger) */
  get cityInput() {
    return this.browser.$("#txtCity");
  }

  /** Visible check-in date display (click to open datepicker) */
  get checkInTrigger() {
    return this.browser.$("#htl_dates");
  }

  /** Visible check-out date display (click to open datepicker) */
  get checkOutTrigger() {
    return this.browser.$("#htl_dates1");
  }

  /** jQuery UI datepicker popup container */
  get datepickerPopup() {
    return this.browser.$("#ui-datepicker-div");
  }

  /** Hotel search button */
  get searchButton() {
    return this.browser.$("#btnSearch");
  }

  // ── Actions ──────────────────────────────────────────────────────────────────

  async open(): Promise<void> {
    console.log("[EaseMyTripHotelsPage] Opening EaseMyTrip Hotels page...");
    await this.navigate(this.url);
    await this.browser.pause(4000);
    await this.dismissChatbot();
  }

  /**
   * Select a hotel destination city via the autocomplete dropdown.
   *
   * Flow:
   *  1. Click the visible city trigger div to activate the input
   *  2. Wait for #txtCity to become visible (or use JS to set value)
   *  3. Type the city name → wait for autocomplete → click matching item
   */
  async selectCity(city: string): Promise<void> {
    console.log(`[EaseMyTripHotelsPage] Selecting city: ${city}`);

    // Step 1: Click the visible trigger to activate the city input field
    const trigger = this.cityTrigger;
    const triggerExists = await trigger.isExisting().catch(() => false);
    if (triggerExists && await trigger.isDisplayed().catch(() => false)) {
      await trigger.click();
      console.log("[EaseMyTripHotelsPage] Clicked city trigger div.");
      await this.browser.pause(800);
    } else {
      // Fallback: JS click on the container
      await this.browser.execute(() => {
        const el = document.querySelector(".hp_inputBox.selectHtlCity, .selectHtlCity") as HTMLElement | null;
        if (el) el.click();
      });
      await this.browser.pause(800);
    }

    // Step 2: Interact with the city input — try visible wait first, then JS setValue
    const input = this.cityInput;
    const inputDisplayed = await input.isDisplayed().catch(() => false);

    if (inputDisplayed) {
      await input.clearValue();
      await input.setValue(city);
    } else {
      // Input is still hidden — use JS to set value and dispatch events
      console.log("[EaseMyTripHotelsPage] City input hidden, using JS to set value...");
      await this.browser.execute((cityName: string) => {
        const el = document.getElementById("txtCity") as HTMLInputElement | null;
        if (!el) return;
        el.value = cityName;
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("keyup", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
      }, city);
    }

    await this.browser.pause(2500); // Wait for autocomplete to load

    await this._selectFromDropdown(city);
    await this.browser.pause(800);
  }

  /**
   * Select the check-in date N days from today (jQuery UI datepicker).
   */
  async selectCheckInDate(daysFromToday: number): Promise<void> {
    console.log(`[EaseMyTripHotelsPage] Selecting check-in date (+${daysFromToday} days)...`);
    // Click the visible check-in trigger
    await this.checkInTrigger.click();
    await this.browser.pause(1000);
    await this._clickCalendarDay(daysFromToday);
  }

  /**
   * Select the check-out date N days from today (jQuery UI datepicker).
   *
   * IMPORTANT: After check-in date selection, the jQuery UI datepicker stays open
   * (range-picker mode). Clicking #htl_dates1 while the datepicker is open causes
   * "element click intercepted" because the popup overlaps the trigger.
   * Solution: if datepicker is already visible, skip the trigger click entirely
   * and directly pick the day in the still-open popup.
   */
  async selectCheckOutDate(daysFromToday: number): Promise<void> {
    console.log(`[EaseMyTripHotelsPage] Selecting check-out date (+${daysFromToday} days)...`);

    const datepicker = this.datepickerPopup;
    const datepickerOpen = await datepicker.isDisplayed().catch(() => false);

    if (!datepickerOpen) {
      console.log("[EaseMyTripHotelsPage] Datepicker not open, clicking check-out trigger...");
      // Use JS click to bypass any overlay that might intercept
      try {
        await this.checkOutTrigger.click();
      } catch {
        await this.browser.execute(() => {
          const el = document.getElementById("htl_dates1") as HTMLElement | null;
          if (el) el.click();
        });
      }
      await this.browser.pause(1000);
    } else {
      console.log("[EaseMyTripHotelsPage] Datepicker already open — picking check-out day directly.");
    }

    await this._clickCalendarDay(daysFromToday);
  }

  /**
   * Click the hotel search button.
   */
  async clickSearch(): Promise<void> {
    console.log("[EaseMyTripHotelsPage] Clicking search button...");
    const btn = this.searchButton;
    await btn.waitForClickable({ timeout: 8000 });
    try {
      await btn.click();
    } catch {
      // JS click fallback
      await this.browser.execute(() => {
        const el = document.getElementById("btnSearch") as HTMLElement | null;
        if (el) el.click();
      });
    }
    await this.browser.pause(5000);
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private async _selectFromDropdown(city: string): Promise<void> {
    // Strategy 1 — XPath text match
    const xpathSelectors = [
      `//li[contains(normalize-space(.), '${city}')]`,
      `//*[contains(@class,'autoComplete_result')]//li[contains(., '${city}')]`,
      `//div[@id='divTopCity']//li[contains(., '${city}')]`,
      `//ul[contains(@class,'ui-autocomplete')]//li[contains(., '${city}')]`,
    ];

    for (const xpath of xpathSelectors) {
      try {
        const el = await this.browser.$(xpath);
        if (await el.isExisting() && await el.isDisplayed()) {
          await el.click();
          console.log(`[EaseMyTripHotelsPage] City selected via XPath: ${xpath}`);
          return;
        }
      } catch { /* try next */ }
    }

    // Strategy 2 — container CSS selectors
    const containerSelectors = [
      ".autoComplete_result li",
      ".autoComplete_wrapper li",
      ".ui-autocomplete li.ui-menu-item",
      "#divTopCity li",
      "ul.ui-autocomplete li",
      "#ui-id-1 li",
      "li.ui-menu-item",
    ];

    for (const sel of containerSelectors) {
      try {
        const el = await this.browser.$(sel);
        if (await el.isExisting() && await el.isDisplayed()) {
          await el.click();
          console.log(`[EaseMyTripHotelsPage] City selected via container: ${sel}`);
          return;
        }
      } catch { /* try next */ }
    }

    // Strategy 3 — JavaScript fallback: click any visible <li> with matching text
    const clicked = await this.browser.execute((cityName: string) => {
      const items = Array.from(document.querySelectorAll("li"));
      const match = items.find(
        (li) => li.textContent?.includes(cityName) && (li as HTMLElement).offsetParent !== null
      );
      if (match) { (match as HTMLElement).click(); return true; }
      return false;
    }, city);

    if (clicked) {
      console.log(`[EaseMyTripHotelsPage] City selected via JS click: ${city}`);
      return;
    }

    throw new Error(
      `[EaseMyTripHotelsPage] Could not select city: ${city}. Dropdown did not appear or no matching item found.`
    );
  }

  /**
   * Click a day in the jQuery UI datepicker popup.
   *
   * The hotels page uses a standard jQuery UI datepicker (unlike the flight calendar).
   * Days are rendered as <a class="ui-state-default"> inside <td> cells.
   * The popup is #ui-datepicker-div.
   */
  private async _clickCalendarDay(daysFromToday: number): Promise<void> {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + daysFromToday);
    const targetDay = String(targetDate.getDate());

    console.log(`[EaseMyTripHotelsPage] Clicking day ${targetDay} in jQuery UI datepicker...`);

    // Wait for datepicker to be visible
    const datepicker = this.datepickerPopup;
    await datepicker.waitForDisplayed({ timeout: 8000 });

    // Strategy 1: standard jQuery UI day anchor (exclude prev/next month cells)
    const xpathSelectors = [
      `//td[not(contains(@class,'ui-datepicker-other-month'))]//a[normalize-space(text())='${targetDay}']`,
      `//a[@class='ui-state-default' and normalize-space(text())='${targetDay}']`,
      `//a[contains(@class,'ui-state-default') and normalize-space(text())='${targetDay}']`,
    ];

    for (const sel of xpathSelectors) {
      try {
        const el = await this.browser.$(sel);
        if (await el.isExisting() && await el.isDisplayed()) {
          await el.click();
          console.log(`[EaseMyTripHotelsPage] ✅ Day clicked via XPath: ${sel}`);
          await this.browser.pause(800);
          return;
        }
      } catch { /* try next */ }
    }

    // Strategy 2: CSS selector scan inside #ui-datepicker-div
    const cssSelectors = [
      `#ui-datepicker-div td:not(.ui-datepicker-other-month) a`,
      `#ui-datepicker-div a.ui-state-default`,
    ];

    for (const sel of cssSelectors) {
      try {
        const anchors = await this.browser.$$(sel);
        for (const anchor of anchors) {
          const text = (await anchor.getText()).trim();
          if (text === targetDay && await anchor.isDisplayed()) {
            await anchor.click();
            console.log(`[EaseMyTripHotelsPage] ✅ Day clicked via CSS scan: ${sel} → day ${targetDay}`);
            await this.browser.pause(800);
            return;
          }
        }
      } catch { /* try next */ }
    }

    throw new Error(
      `[EaseMyTripHotelsPage] Could not click day ${targetDay} in jQuery UI datepicker.`
    );
  }
}
