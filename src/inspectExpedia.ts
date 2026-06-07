import { remote } from "webdriverio";

async function main() {
  console.log("[Inspect] Starting browser...");
  const browser = await remote({
    capabilities: {
      browserName: "chrome",
      "goog:chromeOptions": {
        binary: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        excludeSwitches: ["enable-automation"],
        args: [
          "--disable-gpu",
          "--no-sandbox",
          "--disable-dev-shm-usage",
          "--window-size=1280,800",
          "--disable-http2",
          "--ignore-certificate-errors",
          "--disable-blink-features=AutomationControlled"
        ]
      },
      pageLoadStrategy: "eager"
    },
    logLevel: "error"
  });

  try {
    console.log("[Inspect] Opening Expedia...");
    await browser.url("https://www.expedia.com");
    
    console.log("[Inspect] Waiting for page form/tabs container to render...");
    const form = await browser.$("form");
    await form.waitForDisplayed({ timeout: 15000 });
    console.log("[Inspect] Page form rendered. Scanning...");

    console.log("[Inspect] Searching for elements containing 'Flights'...");
    // Find all links and buttons
    const anchors = await browser.$$("a");
    const buttons = await browser.$$("button");
    const spans = await browser.$$("span");

    console.log(`[Inspect] Found ${anchors.length} anchors, ${buttons.length} buttons, ${spans.length} spans.`);

    for (const a of anchors) {
      const text = await a.getText();
      if (text.toLowerCase().includes("flights") || text.toLowerCase().includes("flight")) {
        console.log(`Anchor - Text: "${text}", href: "${await a.getAttribute("href")}", class: "${await a.getAttribute("class")}", aria-controls: "${await a.getAttribute("aria-controls")}"`);
      }
    }

    for (const b of buttons) {
      const text = await b.getText();
      if (text.toLowerCase().includes("flights") || text.toLowerCase().includes("flight")) {
        console.log(`Button - Text: "${text}", class: "${await b.getAttribute("class")}", aria-controls: "${await b.getAttribute("aria-controls")}", aria-selected: "${await b.getAttribute("aria-selected")}"`);
      }
    }

    for (const s of spans) {
      const text = await s.getText();
      if (text.toLowerCase().includes("flights") || text.toLowerCase().includes("flight")) {
        console.log(`Span - Text: "${text}", class: "${await s.getAttribute("class")}"`);
      }
    }

  } catch (err: any) {
    console.error("[Inspect] Error:", err.message);
  } finally {
    await browser.deleteSession();
    console.log("[Inspect] Session deleted.");
  }
}

main();
