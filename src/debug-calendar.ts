/**
 * Debug script to inspect the calendar DOM structure on EaseMyTrip.
 * Run: npx ts-node src/debug-calendar.ts
 */
import { remote } from "webdriverio";

async function run() {
  console.log("Launching browser...");
  const browser = await remote({
    capabilities: {
      browserName: "chrome",
      "goog:chromeOptions": {
        binary: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        excludeSwitches: ["enable-automation"],
        args: ["--disable-gpu", "--no-sandbox", "--window-size=1280,900",
               "--disable-blink-features=AutomationControlled", "--disable-notifications"]
      },
      pageLoadStrategy: "eager"
    },
    logLevel: "error"
  });

  try {
    await browser.setTimeout({ pageLoad: 30000 });
    await browser.url("https://www.easemytrip.com");
    await browser.pause(3000);

    // Select Pune as origin
    const fromTrigger = await browser.$("#FromSector_show");
    await fromTrigger.waitForClickable({ timeout: 10000 });
    await fromTrigger.click();
    await browser.pause(800);
    const fromInput = await browser.$("#a_FromSector_show");
    await fromInput.setValue("Pune");
    await browser.pause(2000);
    const puneItem = await browser.$("//li[contains(normalize-space(.), 'Pune')]");
    await puneItem.click();
    await browser.pause(1000);

    // Select Delhi as destination (via Top Cities)
    const delhiItem = await browser.$("//li[contains(normalize-space(.), 'Delhi')]");
    await delhiItem.click();
    await browser.pause(2000);

    // Now calendar should auto-open — let's inspect the DOM
    console.log("\n=== CALENDAR DOM INSPECTION ===");

    // Check iframes
    const iframes = await browser.$$("iframe");
    const iframesLen = await iframes.length;
    console.log(`\nNumber of iframes: ${iframesLen}`);
    for (let i = 0; i < iframesLen; i++) {
      const src = await iframes[i].getAttribute("src") || "(no src)";
      const id = await iframes[i].getAttribute("id") || "(no id)";
      const cls = await iframes[i].getAttribute("class") || "(no class)";
      console.log(`  iframe[${i}]: id="${id}" class="${cls}" src="${src}"`);
    }

    // Check total TDs
    const tds = await browser.$$("td");
    const tdsLen = await tds.length;
    console.log(`\nTotal TDs found: ${tdsLen}`);
    if (tdsLen > 0) {
      for (let i = 0; i < Math.min(5, tdsLen); i++) {
        const text = await tds[i].getText();
        const cls = await tds[i].getAttribute("class") || "";
        const visible = await tds[i].isDisplayed();
        console.log(`  td[${i}]: text="${text.substring(0, 30)}" class="${cls}" visible=${visible}`);
      }
    }

    // Check for the calendar container using various selectors
    const calendarSelectors = [
      "#dvcalendar", ".cld-main", ".calDiv", ".calendar-container",
      "[class*='cld']", "[class*='cal']", "[class*='datepicker']",
      ".overlaybg1", "#overlaybg1"
    ];
    console.log("\n=== Calendar Container Search ===");
    for (const sel of calendarSelectors) {
      try {
        const el = await browser.$(sel);
        const exists = await el.isExisting();
        const visible = exists ? await el.isDisplayed() : false;
        if (exists) {
          const html = await el.getHTML();
          console.log(`\n✅ FOUND: ${sel} (visible=${visible})`);
          console.log(`   First 500 chars of HTML:\n${html.substring(0, 500)}`);
        }
      } catch (e) {
        // skip
      }
    }

    // Get full HTML of the overlay to understand structure
    console.log("\n=== overlaybg1 full HTML (first 2000 chars) ===");
    const overlay = await browser.execute(() => {
      const el = document.getElementById("overlaybg1");
      return el ? el.outerHTML.substring(0, 2000) : "NOT FOUND";
    });
    console.log(overlay);

    // Dump all elements with "16" text
    console.log("\n=== Elements containing '16' text ===");
    const elemsWith16 = await browser.execute(() => {
      const result: any[] = [];
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) {
        if (node.textContent?.trim() === "16") {
          const parent = node.parentElement;
          if (parent) {
            result.push({
              tag: parent.tagName,
              id: parent.id,
              cls: parent.className,
              text: parent.textContent?.trim().substring(0, 50),
              visible: (parent as HTMLElement).offsetParent !== null
            });
          }
        }
      }
      return result;
    });
    console.log("Elements with text '16':", JSON.stringify(elemsWith16, null, 2));

  } catch (err) {
    console.error("Error:", err);
  } finally {
    console.log("\nClosing browser...");
    await browser.deleteSession();
  }
}

run();
