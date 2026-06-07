import { BasePage } from "./BasePage";

/**
 * EaseMyTripHomePage — Page Object Model for the EaseMyTrip flight search home page.
 *
 * Handles:
 *  - Navigating to the site
 *  - Dismissing the EVA chatbot overlay
 *  - Selecting origin / destination via the custom autocomplete dropdown
 *  - Selecting a travel date via EaseMyTrip's custom two-month fare calendar
 *  - Triggering the search
 *
 * Key DOM observations (verified June 2026):
 *  - FROM trigger: #FromSector_show → opens #a_FromSector_show input
 *  - TO trigger: #Editbox13-show → opens #a_Editbox13-show input
 *  - After origin selection, TO dropdown auto-opens with "Top Cities"
 *  - After destination selection, the fare calendar auto-opens
 *  - Calendar uses custom <td> cells (NOT jQuery UI datepicker)
 *  - Each TD: first child = day number, second child = fare price
 *  - document.querySelectorAll("td") returns [] while calendar animates in;
 *    must use WDIO's native $$("td") with waitUntil instead
 */
export class EaseMyTripHomePage extends BasePage {
  readonly url = "https://www.easemytrip.com";

  // ── Locators ────────────────────────────────────────────────────────────────

  get fromSectorTrigger() { return this.browser.$("#FromSector_show"); }
  get fromInput() { return this.browser.$("#a_FromSector_show"); }
  get toSectorTrigger() { return this.browser.$("#Editbox13-show"); }
  get toInput() { return this.browser.$("#a_Editbox13-show"); }
  get departureDateTrigger() { return this.browser.$("#ddate"); }
  get searchButton() { return this.browser.$(".srchBtnSe, input[onclick*='SearchFlight'], .shw-flt a.srchBtnSe"); }
  get flightsTab() { return this.browser.$("a[href*='flights'], a.flight, #shw_flt"); }

  private get autocompleteSuggestionSelectors(): string[] {
    return [
      ".autoComplete_result li",
      ".autoComplete_wrapper li",
      ".ui-autocomplete li.ui-menu-item",
      "ul.ui-autocomplete li",
      "#ui-id-1 li",
      "#ui-id-2 li",
      "li.ui-menu-item",
    ];
  }

  // ── Actions ──────────────────────────────────────────────────────────────────

  async open(): Promise<void> {
    console.log("[EaseMyTripHomePage] Opening EaseMyTrip home page...");
    await this.navigate(this.url);
    await this.browser.pause(3000);
    await this.dismissChatbot();
  }

  async ensureFlightsTabSelected(): Promise<void> {
    const tab = this.flightsTab;
    if (await tab.isExisting()) {
      await tab.click();
      await this.browser.pause(1000);
    }
  }

  /**
   * Select origin city via the FROM autocomplete.
   */
  async selectOrigin(city: string): Promise<void> {
    console.log(`[EaseMyTripHomePage] Selecting origin: ${city}`);

    const trigger = this.fromSectorTrigger;
    await trigger.waitForClickable({ timeout: 15000 });
    await trigger.click();
    await this.browser.pause(800);

    const input = this.fromInput;
    await input.waitForDisplayed({ timeout: 8000 });
    await input.clearValue();
    await input.setValue(city);
    await this.browser.pause(2500);

    await this._selectFromDropdown(city, "origin");
    await this.browser.pause(800);
  }

  /**
   * Select destination city.
   * After origin is selected, EaseMyTrip auto-opens the TO dropdown with "Top Cities".
   * We try clicking a visible top-city item first before falling back to typing.
   */
  async selectDestination(city: string): Promise<void> {
    console.log(`[EaseMyTripHomePage] Selecting destination: ${city}`);

    // Try clicking a "Top Cities" shortcut that may already be visible
    const topCityXpaths = [
      `//li[contains(normalize-space(.), '${city}')]`,
      `//div[contains(@class,'toCity') or contains(@class,'to-city')]//li[contains(., '${city}')]`,
    ];
    for (const xpath of topCityXpaths) {
      try {
        const el = await this.browser.$(xpath);
        if (await el.isExisting() && await el.isDisplayed()) {
          await el.click();
          console.log(`[EaseMyTripHomePage] Destination selected via Top Cities shortcut: ${xpath}`);
          await this.browser.pause(800);
          return;
        }
      } catch { /* proceed */ }
    }

    // Check if TO input is already visible (dropdown auto-opened)
    const input = this.toInput;
    const inputVisible = await input.isDisplayed().catch(() => false);

    if (!inputVisible) {
      console.log("[EaseMyTripHomePage] TO dropdown not open, clicking trigger...");
      const trigger = this.toSectorTrigger;
      try {
        await trigger.waitForClickable({ timeout: 8000 });
        await trigger.click();
      } catch {
        await this.browser.execute((sel: string) => {
          const el = document.querySelector(sel) as HTMLElement | null;
          if (el) el.click();
        }, "#Editbox13-show");
      }
      await this.browser.pause(800);
    }

    await input.waitForDisplayed({ timeout: 8000 });
    await input.clearValue();
    await input.setValue(city);
    await this.browser.pause(2500);

    await this._selectFromDropdown(city, "destination");
    await this.browser.pause(800);
  }

  /**
   * Select a travel date N days from today using EaseMyTrip's custom fare calendar.
   *
   * DOM structure (verified June 2026 via debug inspection):
   *  - Calendar container: div#dvcalendar (display:block when open)
   *  - Day cells: <li id="trd_{weekday}_{DD/MM/YYYY}"> e.g. id="trd_2_16/06/2026"
   *  - The calendar auto-opens after destination selection (overlaybg1 becomes visible)
   *  - Calendar cells are <li> NOT <td> — that's why $$('td') returns empty
   */
  async selectTravelDate(daysFromToday: number): Promise<void> {
    console.log(`[EaseMyTripHomePage] Selecting travel date (+${daysFromToday} days)...`);

    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + daysFromToday);
    const targetDay = String(targetDate.getDate()).padStart(2, "0");
    const targetMonth = String(targetDate.getMonth() + 1).padStart(2, "0");
    const targetYear = targetDate.getFullYear();
    // EaseMyTrip LI id format: trd_{weekday}_{DD/MM/YYYY}
    const dateStr = `${targetDay}/${targetMonth}/${targetYear}`;
    const dayNum = targetDate.getDate();

    console.log(`[EaseMyTripHomePage] Target date: ${dateStr}`);

    // Check if calendar (#dvcalendar) is already open
    const calContainer = await this.browser.$("#dvcalendar");
    const calOpen = await calContainer.isExisting()
      .then(async (e) => e && await calContainer.isDisplayed())
      .catch(() => false);

    if (!calOpen) {
      console.log("[EaseMyTripHomePage] Calendar not open, triggering...");
      // Try clicking the visible date display area — EaseMyTrip wraps #ddate in a visible div
      const openStrategies = [
        "#dvDate1", "#dvDate", ".dt-icn", ".dep-date",
        "[onclick*='OpenCalendar']", "[onclick*='openCal']",
      ];
      let opened = false;
      for (const sel of openStrategies) {
        try {
          const el = await this.browser.$(sel);
          if (await el.isExisting() && await el.isDisplayed()) {
            await el.click();
            await this.browser.pause(1200);
            const nowOpen = await calContainer.isDisplayed().catch(() => false);
            if (nowOpen) { opened = true; break; }
          }
        } catch { /* try next */ }
      }
      if (!opened) {
        // JS click on ddate as fallback
        await this.browser.execute(() => {
          const el = document.getElementById("ddate");
          if (el) el.click();
        });
        await this.browser.pause(1500);
      }
    } else {
      console.log("[EaseMyTripHomePage] Calendar already open (#dvcalendar visible).");
    }

    // Wait for calendar to be visible
    await calContainer.waitForDisplayed({ timeout: 10000 });
    console.log("[EaseMyTripHomePage] #dvcalendar is visible.");

    // Strategy 1: Click the exact LI by id pattern (trd_{weekday}_{DD/MM/YYYY})
    for (let weekday = 0; weekday <= 6; weekday++) {
      const liId = `#trd_${weekday}_${dateStr}`;
      try {
        const li = await this.browser.$(liId);
        if (await li.isExisting() && await li.isDisplayed()) {
          await this.browser.execute((el) => (el as unknown as HTMLElement).click(), li);
          console.log(`[EaseMyTripHomePage] ✅ Date clicked via LI id: ${liId}`);
          await this.browser.pause(1000);
          return;
        }
      } catch { /* try next weekday */ }
    }

    // Strategy 2: XPath — any LI whose id contains the date string
    const xpathLi = `//li[contains(@id, '${dateStr}')]`;
    console.log(`[EaseMyTripHomePage] Trying XPath: ${xpathLi}`);
    const lis = await this.browser.$$(xpathLi);
    for (const li of lis) {
      try {
        if (await li.isDisplayed()) {
          await this.browser.execute((el) => (el as unknown as HTMLElement).click(), li);
          console.log(`[EaseMyTripHomePage] ✅ Date clicked via XPath LI`);
          await this.browser.pause(1000);
          return;
        }
      } catch { /* skip */ }
    }

    // Strategy 3: Text scan all LIs inside #dvcalendar
    console.log("[EaseMyTripHomePage] Scanning #dvcalendar LIs by text...");
    const calLis = await this.browser.$$("#dvcalendar li");
    for (const li of calLis) {
      try {
        if (!(await li.isDisplayed())) continue;
        const text = await li.getText();
        const numMatch = text.trim().match(/^(\d+)/);
        if (numMatch && parseInt(numMatch[1], 10) === dayNum) {
          await this.browser.execute((el) => (el as unknown as HTMLElement).click(), li);
          console.log(`[EaseMyTripHomePage] ✅ Date clicked via text scan: day ${dayNum}`);
          await this.browser.pause(1000);
          return;
        }
      } catch { /* skip */ }
    }

    throw new Error(
      `[EaseMyTripHomePage] Could not click date ${dateStr}. ` +
      `Tried LI id pattern, XPath (found ${lis.length}), and text scan (found ${calLis.length} LIs).`
    );
  }

  /**
   * Click the search button to submit the flight search.
   * Uses JS click as fallback to bypass any remaining overlay.
   */
  async clickSearch(): Promise<void> {
    console.log("[EaseMyTripHomePage] Clicking search button...");
    try {
      const btn = this.searchButton;
      await btn.waitForClickable({ timeout: 5000 });
      await btn.click();
    } catch {
      console.log("[EaseMyTripHomePage] Normal click failed, using JS click...");
      await this.browser.execute(() => {
        const selectors = [".srchBtnSe", "input[onclick*='SearchFlight']", ".shw-flt a.srchBtnSe"];
        for (const sel of selectors) {
          const el = document.querySelector(sel) as HTMLElement | null;
          if (el) { el.click(); return; }
        }
      });
    }
    await this.browser.pause(5000);
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private async _selectFromDropdown(city: string, role: string): Promise<void> {
    // Strategy 1 — XPath text match
    const xpathSelectors = [
      `//li[contains(normalize-space(.), '${city}')]`,
      `//*[contains(@class,'autoComplete_result')]//li[contains(., '${city}')]`,
      `//ul[contains(@class,'ui-autocomplete')]//li[contains(., '${city}')]`,
    ];
    for (const xpath of xpathSelectors) {
      try {
        const el = await this.browser.$(xpath);
        if (await el.isExisting() && await el.isDisplayed()) {
          await el.click();
          console.log(`[EaseMyTripHomePage] ${role} selected via XPath: ${xpath}`);
          return;
        }
      } catch { /* try next */ }
    }

    // Strategy 2 — container CSS selectors
    for (const sel of this.autocompleteSuggestionSelectors) {
      try {
        const el = await this.browser.$(sel);
        if (await el.isExisting() && await el.isDisplayed()) {
          await el.click();
          console.log(`[EaseMyTripHomePage] ${role} selected via container: ${sel}`);
          return;
        }
      } catch { /* try next */ }
    }

    // Strategy 3 — JS click on any visible <li> with matching text
    try {
      const clicked = await this.browser.execute((cityName: string) => {
        const items = Array.from(document.querySelectorAll("li"));
        const match = items.find(
          (li) => li.textContent?.includes(cityName) && (li as HTMLElement).offsetParent !== null
        );
        if (match) { (match as HTMLElement).click(); return true; }
        return false;
      }, city);

      if (clicked) {
        console.log(`[EaseMyTripHomePage] ${role} selected via JS click for: ${city}`);
        return;
      }
    } catch { /* proceed to error */ }

    throw new Error(
      `[EaseMyTripHomePage] Could not select ${role} city: ${city}. Dropdown did not appear or no matching item found.`
    );
  }
}
