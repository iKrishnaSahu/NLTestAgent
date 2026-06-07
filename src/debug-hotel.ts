/**
 * Debug script to inspect the Hotel page DOM selectors.
 * Run: npx ts-node src/debug-hotel.ts
 */
import { remote } from "webdriverio";

async function run() {
  const browser = await remote({
    capabilities: {
      browserName: "chrome",
      "goog:chromeOptions": {
        binary: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        excludeSwitches: ["enable-automation"],
        args: [
          "--disable-gpu", "--no-sandbox", "--window-size=1280,900",
          "--disable-blink-features=AutomationControlled", "--disable-notifications"
        ]
      },
      pageLoadStrategy: "eager"
    },
    logLevel: "error"
  });

  try {
    await browser.url("https://www.easemytrip.com/hotels/");
    await browser.pause(4000);

    console.log("\n=== Hotel page: ALL input elements ===");
    const inputs = await browser.execute(() => {
      return Array.from(document.querySelectorAll("input, textarea")).map(el => ({
        tag: el.tagName,
        id: el.id,
        name: (el as HTMLInputElement).name,
        cls: el.className,
        placeholder: (el as HTMLInputElement).placeholder,
        type: (el as HTMLInputElement).type,
        visible: (el as HTMLElement).offsetParent !== null,
        value: (el as HTMLInputElement).value
      }));
    });
    console.log(JSON.stringify(inputs, null, 2));

    console.log("\n=== Hotel page: ALL divs/spans with 'city' in id or class ===");
    const cityEls = await browser.execute(() => {
      return Array.from(document.querySelectorAll("[id*='city' i], [id*='City'], [class*='city' i]")).map(el => ({
        tag: el.tagName,
        id: el.id,
        cls: el.className,
        text: el.textContent?.trim().substring(0, 80),
        visible: (el as HTMLElement).offsetParent !== null
      }));
    });
    console.log("City-related elements:", JSON.stringify(cityEls, null, 2));

    console.log("\n=== Check-In elements ===");
    const dateEls = await browser.execute(() => {
      return Array.from(document.querySelectorAll("[id*='check' i], [id*='Check'], [id*='date' i], [id*='Date']")).map(el => ({
        tag: el.tagName,
        id: el.id,
        cls: el.className,
        text: el.textContent?.trim().substring(0, 80),
        visible: (el as HTMLElement).offsetParent !== null
      }));
    });
    console.log("Date-related elements:", JSON.stringify(dateEls, null, 2));

    console.log("\n=== Search button candidates ===");
    const btns = await browser.execute(() => {
      return Array.from(document.querySelectorAll("button, input[type='button'], input[type='submit'], a")).filter(el => {
        const text = el.textContent?.trim().toLowerCase() || "";
        const id = el.id?.toLowerCase() || "";
        const cls = el.className?.toLowerCase() || "";
        return text.includes("search") || id.includes("search") || cls.includes("search");
      }).map(el => ({
        tag: el.tagName,
        id: el.id,
        cls: el.className,
        text: el.textContent?.trim().substring(0, 50),
        visible: (el as HTMLElement).offsetParent !== null
      }));
    });
    console.log("Search buttons:", JSON.stringify(btns, null, 2));

  } finally {
    await browser.deleteSession();
  }
}

run().catch(console.error);
