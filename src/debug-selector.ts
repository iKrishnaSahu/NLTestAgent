import { remote } from "webdriverio";

async function run() {
  console.log("Initializing browser...");
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
          "--disable-blink-features=AutomationControlled"
        ]
      }
    },
    logLevel: "error"
  });

  try {
    console.log("Navigating to EaseMyTrip...");
    await browser.url("https://www.easemytrip.com");
    await browser.pause(5000);

    // Dismiss chatbot if present
    const closeBtn = await browser.$("#imgCro, .close-btn, #close-eva, .close-chat, #chatCloseBtn");
    if (await closeBtn.isExisting() && await closeBtn.isDisplayed()) {
      await closeBtn.click();
      console.log("Dismissed chatbot overlay");
      await browser.pause(1000);
    }

    console.log("Clicking FromSector_show...");
    const fromTrigger = await browser.$("#FromSector_show");
    await fromTrigger.click();
    await browser.pause(1000);

    console.log("Dumping active input elements after clicking From...");
    const inputsAfterFrom = await browser.$$("input");
    for (const input of inputsAfterFrom) {
      if (await input.isDisplayed()) {
        console.log(`Active Input: ID: ${await input.getAttribute("id")}, Class: ${await input.getAttribute("class")}, Value: ${await input.getValue()}`);
      }
    }

    console.log("Typing 'Pune'...");
    // Let's see if we type in the active input or direct
    const fromInput = await browser.$("#a_FromSector_show");
    if (await fromInput.isExisting() && await fromInput.isDisplayed()) {
      await fromInput.setValue("Pune");
    } else {
      const fromSector_show = await browser.$("#FromSector_show");
      await fromSector_show.setValue("Pune");
    }
    await browser.pause(2000);

    console.log("Clicking Pune(PNQ) suggestion...");
    const targetLi = await browser.$("//li[contains(., 'Pune(PNQ)')]");
    await targetLi.click();
    await browser.pause(1000);

    console.log("Clicking destination trigger or typing in destination input...");
    const toInput = await browser.$("#a_Editbox13_show");
    await toInput.waitForDisplayed({ timeout: 5000 });
    await toInput.setValue("Delhi");
    await browser.pause(2000);

    console.log("Clicking Delhi(DEL) suggestion...");
    const targetDelhiLi = await browser.$("//li[contains(., 'Delhi(DEL)')]");
    await targetDelhiLi.waitForDisplayed({ timeout: 5000 });
    console.log(`Delhi suggestion Outer HTML: \n${await targetDelhiLi.getHTML()}`);
    
    // Let's try JS click to ensure it triggers the onclick handler reliably
    console.log("Clicking Delhi suggestion via JS...");
    await browser.execute((el) => (el as any).click(), targetDelhiLi);
    console.log("Delhi suggestion clicked!");
    await browser.pause(2000);

    // Print values to verify selection
    const toInputVal = await browser.$("#Editbox13_show").getValue();
    const a_toInputVal = await browser.$("#a_Editbox13_show").getValue();
    console.log(`Editbox13_show value: ${toInputVal}`);
    console.log(`a_Editbox13_show value: ${a_toInputVal}`);

    console.log("Inspecting date field parent...");
    const dateTrigger = await browser.$("#ddate");
    const parent = await dateTrigger.parentElement();
    console.log(`dateTrigger parent tag: <${await parent.getTagName()}>, class: ${await parent.getAttribute("class")}`);
    console.log(`parent outer HTML:\n${await parent.getHTML()}`);
    
    // Let's dump all displayed elements that could be the calendar
    console.log("Dumping all displayed elements that could be calendar-related...");
    const allDivs = await browser.$$("div, table, ul");
    let count = 0;
    for (const div of allDivs) {
      if (await div.isDisplayed()) {
        const id = await div.getAttribute("id");
        const className = await div.getAttribute("class");
        const text = await div.getText();
        if ((id && (id.includes("date") || id.includes("cal"))) || 
            (className && (className.includes("date") || className.includes("cal") || className.includes("cld") || className.includes("month")))) {
          count++;
          console.log(`Calendar Element ${count}: Tag: ${await div.getTagName()}, ID: ${id}, Class: ${className}, Text (first 100 chars): ${text.substring(0, 100).replace(/\n/g, " | ")}`);
        }
      }
    }

    console.log("Inspecting #dvcalendar HTML...");
    const cal = await browser.$("#dvcalendar");
    if (await cal.isExisting()) {
      console.log(`dvcalendar HTML (first 1500 chars):\n${(await cal.getHTML()).substring(0, 1500)}`);
    } else {
      console.log("#dvcalendar does not exist.");
    }
  } catch (error) {
    console.error("Error occurred:", error);
  } finally {
    console.log("Deleting session...");
    await browser.deleteSession();
  }
}

run();
