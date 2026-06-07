# NLTestAgent Recreation Prompt

You are a senior software engineer and test automation expert. Your goal is to recreate the **NLTestAgent** application—an AI-first end-to-end test orchestration framework.

This framework allows users to describe test scenarios in plain English (natural language), uses an LLM (AWS Bedrock / Claude 3.5 Sonnet) or a local keyword fallback to identify the correct test workflow, and then automates a real Chrome browser via WebdriverIO using the Page Object Model (POM).

---

## 1. Project Directory Structure
Create the following directories and files:

```text
nltestagent/
├── package.json
├── tsconfig.json
├── .env.example
├── src/
│   ├── app.ts
│   ├── server.ts
│   ├── run.ts
│   ├── cli.ts
│   ├── debug-calendar.ts
│   ├── debug-selector.ts
│   ├── inspectExpedia.ts
│   ├── browser/
│   │   └── browserFactory.ts
│   ├── ai/
│   │   ├── bedrockClient.ts
│   │   ├── promptBuilder.ts
│   │   └── workflowSelector.ts
│   ├── pages/
│   │   ├── BasePage.ts
│   │   ├── EaseMyTripHomePage.ts
│   │   ├── EaseMyTripHotelsPage.ts
│   │   ├── FlightResultsPage.ts
│   │   └── HotelResultsPage.ts
│   ├── dsl/
│   │   ├── flightSearchFlow.ts
│   │   └── hotelSearchFlow.ts
│   ├── registry/
│   │   └── workflowRegistry.ts
│   ├── executor/
│   │   └── workflowExecutor.ts
│   └── reports/
│       └── reportGenerator.ts
```

---

## 2. Configuration & Setup Files

### `package.json`
```json
{
  "name": "nltestagent",
  "version": "1.0.0",
  "description": "AI-first E2E test orchestration — describe test scenarios in plain English, execute them in real browsers via WebdriverIO and AWS Bedrock",
  "main": "dist/server.js",
  "type": "module",
  "scripts": {
    "build": "tsc",
    "start": "node dist/server.js",
    "dev": "tsx src/server.ts",
    "orchestrate": "tsx src/cli.ts"
  },
  "keywords": [
    "test-automation",
    "nlp",
    "ai-testing",
    "webdriverio",
    "aws-bedrock",
    "e2e",
    "semantic-testing"
  ],
  "author": "",
  "license": "ISC",
  "dependencies": {
    "@aws-sdk/client-bedrock-runtime": "^3.1063.0",
    "dotenv": "^17.4.2",
    "express": "^5.2.1",
    "webdriverio": "^9.27.2"
  },
  "devDependencies": {
    "@types/express": "^5.0.6",
    "@types/node": "^25.9.2",
    "ts-node": "^10.9.2",
    "tsx": "^4.22.4",
    "typescript": "^6.0.3"
  }
}
```

### `tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### `.env.example`
```env
# Copy this file to .env and fill in your values.
# Do NOT commit .env to version control.

# ── AWS Bedrock (required only if BYPASS_BEDROCK=false) ────────────────────────
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key_id_here
AWS_SECRET_ACCESS_KEY=your_secret_access_key_here

# Bedrock model ID
# Claude 3.5 Sonnet (recommended):
BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20240620-v1:0

# ── Orchestration Mode ─────────────────────────────────────────────────────────
# Set to "true" to skip Bedrock API calls and use fast local keyword routing.
# Recommended for local development and CI pipelines without AWS access.
BYPASS_BEDROCK=true

# ── Browser Configuration ──────────────────────────────────────────────────────
# Path to the Google Chrome binary. Defaults to the standard macOS location.
# Override for Linux/Windows CI environments.
# CHROME_BINARY=/usr/bin/google-chrome

# WebdriverIO log level: "trace" | "debug" | "info" | "warn" | "error" | "silent"
# WDIO_LOG_LEVEL=error

# ── HTTP API Server ────────────────────────────────────────────────────────────
# Express API port
PORT=3000
```

---

## 3. Source Code Files (`src/`)

### `src/app.ts`
```typescript
import express from "express";
import router from "./api/routes.js";

const app = express();

// Middleware for parsing JSON request bodies
app.use(express.json());

// Mount API routes
app.use("/", router);

export default app;
```

### `src/server.ts`
```typescript
import app from "./app.js";
import dotenv from "dotenv";

dotenv.config();

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`[Server] AI Semantic Test Orchestration server is running at http://localhost:${port}`);
});
```

### `src/run.ts`
```typescript
import { selectWorkflow } from "./ai/workflowSelector.js";
import { executeWorkflow } from "./executor/workflowExecutor.js";
import { generateReport } from "./reports/reportGenerator.js";

/**
 * Reusable core orchestration function.
 * Matches user prompt to registered test flow, executes it, and returns the report result.
 */
export async function runOrchestrator(prompt: string): Promise<{
  workflow: string;
  status: "PASSED" | "FAILED";
  summary: string;
}> {
  // 1. Log: Prompt received
  console.log(`[LOG] Prompt received: "${prompt}"`);

  // 2. Select workflow
  const workflow = await selectWorkflow(prompt);
  // Log: Workflow selected
  console.log(`[LOG] Workflow selected: ${workflow.name}`);

  // 3. Start execution
  console.log(`[LOG] Execution started`);
  const result = await executeWorkflow(workflow.name);
  
  // 4. Execution completed
  console.log(`[LOG] Execution completed`);

  // 5. Generate report
  const summaryReport = generateReport(workflow.name, result.status, result.details);
  // Log: Report generated
  console.log(`[LOG] Report generated`);

  return {
    workflow: workflow.name,
    status: result.status,
    summary: summaryReport
  };
}
```

### `src/cli.ts`
```typescript
import { runOrchestrator } from "./run.js";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  // Read target prompt from arguments
  const promptArg = process.argv[2];

  if (!promptArg) {
    console.error("Error: Please provide a natural language prompt argument.");
    console.error('Usage: npm run orchestrate -- "Validate flight search from Pune to Delhi"');
    process.exit(1);
  }

  console.log("==================================================");
  console.log("Starting Semantic Test Orchestration CLI...");
  console.log(`Prompt: "${promptArg}"`);
  console.log("==================================================");

  try {
    const result = await runOrchestrator(promptArg);
    console.log("==================================================");
    console.log("Execution Finished!");
    console.log(`Selected Workflow: ${result.workflow}`);
    console.log(`Status Outcome:    ${result.status}`);
    console.log("==================================================");
    console.log("Semantic Execution Report:\n");
    console.log(result.summary);
    console.log("==================================================");

    if (result.status === "FAILED") {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (error: any) {
    console.error("Fatal Orchestration CLI error:", error.message || error);
    process.exit(1);
  }
}

main();
```

### `src/browser/browserFactory.ts`
```typescript
import { remote } from "webdriverio";
import dotenv from "dotenv";

dotenv.config();

/**
 * browserFactory — Single source of truth for WebdriverIO Chrome configuration.
 *
 * All DSL workflow files MUST use this factory instead of inlining their own
 * remote() config. This eliminates duplication and ensures consistent flags
 * across all browser sessions.
 *
 * Configuration via environment variables:
 *   CHROME_BINARY  — path to Chrome executable (defaults to macOS path)
 *   WDIO_LOG_LEVEL — WebdriverIO log level (default: "error")
 */

const DEFAULT_CHROME_BINARY =
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

export async function createBrowser() {
  const chromeBinary = process.env.CHROME_BINARY || DEFAULT_CHROME_BINARY;
  const logLevel = (process.env.WDIO_LOG_LEVEL as any) || "error";

  return remote({
    capabilities: {
      browserName: "chrome",
      "goog:chromeOptions": {
        binary: chromeBinary,
        excludeSwitches: ["enable-automation"],
        args: [
          "--disable-gpu",
          "--no-sandbox",
          "--disable-dev-shm-usage",
          "--window-size=1280,900",
          "--disable-http2",
          "--ignore-certificate-errors",
          "--disable-blink-features=AutomationControlled",
          "--disable-notifications",
        ],
      },
      pageLoadStrategy: "eager" as const,
    },
    logLevel,
  });
}
```

### `src/ai/bedrockClient.ts`
```typescript
import { BedrockRuntimeClient, ConverseCommand } from "@aws-sdk/client-bedrock-runtime";
import dotenv from "dotenv";

dotenv.config();

const region = process.env.AWS_REGION || "us-east-1";
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
const modelId = process.env.BEDROCK_MODEL_ID || "anthropic.claude-3-5-sonnet-20240620-v1:0";

if (!accessKeyId || !secretAccessKey) {
  console.warn("[Bedrock Client] WARNING: AWS credentials (AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY) are not set in environment variables. Bedrock calls will fail.");
}

const clientConfig: any = { region };

if (accessKeyId && secretAccessKey) {
  clientConfig.credentials = {
    accessKeyId,
    secretAccessKey,
  };
} else {
  console.log("[Bedrock Client] AWS credentials not found in environment, relying on SDK credential provider chain (e.g. ~/.aws/credentials)...");
}

const client = new BedrockRuntimeClient(clientConfig);

/**
 * Invokes the configured Bedrock model (e.g. Claude 3.5 Sonnet) with the given prompt.
 * Uses ConverseCommand for optimal compatibility across Bedrock models.
 */
export async function invokeBedrock(prompt: string): Promise<string> {
  console.log(`[Bedrock Client] Invoking model: ${modelId}`);
  try {
    const command = new ConverseCommand({
      modelId,
      messages: [
        {
          role: "user",
          content: [{ text: prompt }],
        },
      ],
      inferenceConfig: {
        temperature: 0,
        maxTokens: 1000,
      },
    });

    const response = await client.send(command);
    const text = response.output?.message?.content?.[0]?.text;
    if (!text) {
      throw new Error("Empty response received from Bedrock");
    }
    return text;
  } catch (error) {
    console.error(`[Bedrock Client] Error invoking Bedrock model:`, error);
    throw error;
  }
}
```

### `src/ai/promptBuilder.ts`
```typescript
export interface WorkflowMeta {
  name: string;
  description: string;
}

/**
 * Generates the semantic prompt instructing AWS Bedrock / Claude to select
 * the appropriate workflow based on the user's natural language request.
 *
 * The example JSON in the prompt uses a placeholder name rather than a real
 * workflow name to avoid biasing the model toward any specific workflow.
 */
export function buildWorkflowSelectionPrompt(
  userRequest: string,
  workflows: WorkflowMeta[]
): string {
  const workflowBlocks = workflows
    .map((w) => `${w.name}\nDescription:\n${w.description}`)
    .join("\n\n");

  return `You are a test orchestration assistant. Based on the user's request, select the most appropriate workflow from the list below.

Available Workflows:

${workflowBlocks}

User Request:
${userRequest}

Respond with a JSON object only — no explanation, no markdown fences:

{
  "workflow": "<workflow_name>"
}
`;
}
```

### `src/ai/workflowSelector.ts`
```typescript
import { invokeBedrock } from "./bedrockClient.js";
import { buildWorkflowSelectionPrompt } from "./promptBuilder.js";
import { getAllWorkflows, getWorkflow, Workflow } from "../registry/workflowRegistry.js";

/**
 * Analyzes the user's natural language request and uses AWS Bedrock
 * to select the appropriate test workflow.
 */
export async function selectWorkflow(userRequest: string): Promise<Workflow> {
  if (process.env.BYPASS_BEDROCK === "true") {
    console.log("[Workflow Selector] Bedrock bypass enabled. Using local semantic parser directly.");
    return localSemanticFallback(userRequest);
  }

  const workflows = getAllWorkflows().map(w => ({
    name: w.name,
    description: w.description
  }));

  let rawResponse: string;
  try {
    const prompt = buildWorkflowSelectionPrompt(userRequest, workflows);
    rawResponse = await invokeBedrock(prompt);
    console.log(`[Workflow Selector] Raw Bedrock Response: \n${rawResponse}`);
  } catch (error: any) {
    console.warn(`[Workflow Selector] Bedrock invocation failed (${error.message || error}). Falling back to local semantic parser.`);
    return localSemanticFallback(userRequest);
  }

  let parsed: any;
  try {
    parsed = parseJsonResponse(rawResponse);
  } catch (error) {
    throw new Error(`Failed to parse JSON response from Bedrock. Raw response was: ${rawResponse}`);
  }

  const selectedName = parsed.workflow;
  if (!selectedName) {
    throw new Error(`Bedrock response JSON is missing the 'workflow' key. Response: ${JSON.stringify(parsed)}`);
  }

  const workflow = getWorkflow(selectedName);
  if (!workflow) {
    throw new Error(`Selected workflow '${selectedName}' does not exist in the workflow registry.`);
  }

  return workflow;
}

/**
 * Basic semantic keyword matcher used when external AI calls fail.
 */
function localSemanticFallback(userRequest: string): Workflow {
  const reqLower = userRequest.toLowerCase();
  
  if (reqLower.includes("flight") || reqLower.includes("fly") || reqLower.includes("pune") || reqLower.includes("delhi")) {
    const workflow = getWorkflow("validateFlightSearchFlow");
    if (workflow) return workflow;
  }
  
  if (reqLower.includes("hotel") || reqLower.includes("stay") || reqLower.includes("room") || reqLower.includes("mumbai") || reqLower.includes("resort")) {
    const workflow = getWorkflow("validateHotelSearchFlow");
    if (workflow) return workflow;
  }

  // Default fallback if no keyword matches
  const defaultWorkflow = getWorkflow("validateFlightSearchFlow");
  if (defaultWorkflow) return defaultWorkflow;

  throw new Error("No workflows found in the registry.");
}

/**
 * Extract and parse a JSON object from text, handling potential Markdown formatting.
 */
function parseJsonResponse(text: string): any {
  // Extract content inside ```json ... ``` or ``` ... ``` if present
  const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/```\s*([\s\S]*?)\s*```/);
  const candidate = jsonMatch ? jsonMatch[1] : text;

  const startIdx = candidate.indexOf("{");
  const endIdx = candidate.lastIndexOf("}");
  if (startIdx === -1 || endIdx === -1) {
    throw new Error("No JSON object structure found in response");
  }

  const jsonString = candidate.substring(startIdx, endIdx + 1).trim();
  return JSON.parse(jsonString);
}
```

### `src/pages/BasePage.ts`
```typescript
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
```

### `src/pages/EaseMyTripHomePage.ts`
```typescript
import { BasePage } from "./BasePage.js";

/**
 * EaseMyTripHomePage — Page Object Model for the EaseMyTrip flight search home page.
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

  async selectTravelDate(daysFromToday: number): Promise<void> {
    console.log(`[EaseMyTripHomePage] Selecting travel date (+${daysFromToday} days)...`);

    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + daysFromToday);
    const targetDay = String(targetDate.getDate()).padStart(2, "0");
    const targetMonth = String(targetDate.getMonth() + 1).padStart(2, "0");
    const targetYear = targetDate.getFullYear();
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

  private async _selectFromDropdown(city: string, role: string): Promise<void> {
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
    } catch { /* proceed */ }

    throw new Error(
      `[EaseMyTripHomePage] Could not select ${role} city: ${city}. Dropdown did not appear or no matching item found.`
    );
  }
}
```

### `src/pages/EaseMyTripHotelsPage.ts`
```typescript
import { BasePage } from "./BasePage.js";

/**
 * EaseMyTripHotelsPage — Page Object Model for the EaseMyTrip hotel search page.
 */
export class EaseMyTripHotelsPage extends BasePage {
  readonly url = "https://www.easemytrip.com/hotels/";

  // ── Locators ────────────────────────────────────────────────────────────────

  get cityTrigger() {
    return this.browser.$(".hp_inputBox.selectHtlCity, .selectHtlCity");
  }

  get cityInput() {
    return this.browser.$("#txtCity");
  }

  get checkInTrigger() {
    return this.browser.$("#htl_dates");
  }

  get checkOutTrigger() {
    return this.browser.$("#htl_dates1");
  }

  get datepickerPopup() {
    return this.browser.$("#ui-datepicker-div");
  }

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

  async selectCity(city: string): Promise<void> {
    console.log(`[EaseMyTripHotelsPage] Selecting city: ${city}`);

    const trigger = this.cityTrigger;
    const triggerExists = await trigger.isExisting().catch(() => false);
    if (triggerExists && await trigger.isDisplayed().catch(() => false)) {
      await trigger.click();
      console.log("[EaseMyTripHotelsPage] Clicked city trigger div.");
      await this.browser.pause(800);
    } else {
      await this.browser.execute(() => {
        const el = document.querySelector(".hp_inputBox.selectHtlCity, .selectHtlCity") as HTMLElement | null;
        if (el) el.click();
      });
      await this.browser.pause(800);
    }

    const input = this.cityInput;
    const inputDisplayed = await input.isDisplayed().catch(() => false);

    if (inputDisplayed) {
      await input.clearValue();
      await input.setValue(city);
    } else {
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

    await this.browser.pause(2500); // Wait for autocomplete

    await this._selectFromDropdown(city);
    await this.browser.pause(800);
  }

  async selectCheckInDate(daysFromToday: number): Promise<void> {
    console.log(`[EaseMyTripHotelsPage] Selecting check-in date (+${daysFromToday} days)...`);
    await this.checkInTrigger.click();
    await this.browser.pause(1000);
    await this._clickCalendarDay(daysFromToday);
  }

  async selectCheckOutDate(daysFromToday: number): Promise<void> {
    console.log(`[EaseMyTripHotelsPage] Selecting check-out date (+${daysFromToday} days)...`);

    const datepicker = this.datepickerPopup;
    const datepickerOpen = await datepicker.isDisplayed().catch(() => false);

    if (!datepickerOpen) {
      console.log("[EaseMyTripHotelsPage] Datepicker not open, clicking check-out trigger...");
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

  async clickSearch(): Promise<void> {
    console.log("[EaseMyTripHotelsPage] Clicking search button...");
    const btn = this.searchButton;
    await btn.waitForClickable({ timeout: 8000 });
    try {
      await btn.click();
    } catch {
      await this.browser.execute(() => {
        const el = document.getElementById("btnSearch") as HTMLElement | null;
        if (el) el.click();
      });
    }
    await this.browser.pause(5000);
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private async _selectFromDropdown(city: string): Promise<void> {
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

  private async _clickCalendarDay(daysFromToday: number): Promise<void> {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + daysFromToday);
    const targetDay = String(targetDate.getDate());

    console.log(`[EaseMyTripHotelsPage] Clicking day ${targetDay} in jQuery UI datepicker...`);

    const datepicker = this.datepickerPopup;
    await datepicker.waitForDisplayed({ timeout: 8000 });

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
```

### `src/pages/FlightResultsPage.ts`
```typescript
import { BasePage } from "./BasePage.js";

/**
 * FlightResultsPage — Page Object Model for the EaseMyTrip flight search results page.
 */
export class FlightResultsPage extends BasePage {
  // ── Locators ────────────────────────────────────────────────────────────────

  get flightListContainer() {
    return this.browser.$(".flight-list, .flt-list, .result-col, #fltListingContainer, .flightList");
  }

  get flightCards() {
    return this.browser.$$(".flt-i-sec, .flight-row, .result-item, .fli-det");
  }

  // ── Actions ──────────────────────────────────────────────────────────────────

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

  async getCurrentUrl(): Promise<string> {
    return this.browser.getUrl();
  }

  async getFlightCount(): Promise<number> {
    return (await this.flightCards).length;
  }
}
```

### `src/pages/HotelResultsPage.ts`
```typescript
import { BasePage } from "./BasePage.js";

/**
 * HotelResultsPage — Page Object Model for the EaseMyTrip hotel search results page.
 */
export class HotelResultsPage extends BasePage {
  // ── Locators ────────────────────────────────────────────────────────────────

  get hotelListContainer() {
    return this.browser.$(
      ".hotel-list, .htl-list, #hotelListingContainer, .hotelCard, .htl-card"
    );
  }

  // ── Actions ──────────────────────────────────────────────────────────────────

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

  async getCurrentUrl(): Promise<string> {
    return this.browser.getUrl();
  }
}
```

### `src/dsl/flightSearchFlow.ts`
```typescript
import fs from "fs";
import path from "path";
import { createBrowser } from "../browser/browserFactory.js";
import { EaseMyTripHomePage } from "../pages/EaseMyTripHomePage.js";
import { FlightResultsPage } from "../pages/FlightResultsPage.js";

export interface WorkflowResult {
  status: "PASSED" | "FAILED";
  summary: string;
  details?: {
    steps: Array<{ name: string; status: "PASSED" | "FAILED"; error?: string }>;
    screenshotPath?: string;
  };
}

/**
 * validateFlightSearchFlow
 *
 * Automates EaseMyTrip flight search validation using WebdriverIO.
 */
export async function validateFlightSearchFlow(): Promise<WorkflowResult> {
  const stepsReport: Array<{ name: string; status: "PASSED" | "FAILED"; error?: string }> = [];

  const addStep = (name: string, status: "PASSED" | "FAILED", error?: string) => {
    stepsReport.push({ name, status, error });
  };

  console.log("[Flight DSL] Initializing WebdriverIO browser session for EaseMyTrip...");
  const browser = await createBrowser();

  let screenshotPath: string | undefined;

  const homePage = new EaseMyTripHomePage(browser);
  const resultsPage = new FlightResultsPage(browser);

  try {
    console.log("[Flight DSL] Setting page load timeout to 30 seconds...");
    await browser.setTimeout({ pageLoad: 30000 });

    // ── Step 1: Open website ─────────────────────────────────────────────────
    console.log("[Flight DSL] Step 1: Opening EaseMyTrip website...");
    await homePage.open();
    await homePage.ensureFlightsTabSelected();
    addStep("Open website", "PASSED");

    // ── Step 2: Select origin (Pune) ─────────────────────────────────────────
    console.log("[Flight DSL] Step 2: Selecting source city (Pune)...");
    await homePage.selectOrigin("Pune");
    addStep("Source selection (Pune)", "PASSED");

    // ── Step 3: Select destination (Delhi) ───────────────────────────────────
    console.log("[Flight DSL] Step 3: Selecting destination city (Delhi)...");
    await homePage.selectDestination("Delhi");
    addStep("Destination selection (Delhi)", "PASSED");

    // ── Step 4: Select travel date (+10 days) ────────────────────────────────
    console.log("[Flight DSL] Step 4: Selecting travel date (+10 days)...");
    await homePage.selectTravelDate(10);
    addStep("Future travel date selection", "PASSED");

    // ── Step 5: Click Search ──────────────────────────────────────────────────
    console.log("[Flight DSL] Step 5: Clicking search button...");
    await homePage.clickSearch();
    addStep("Search execution", "PASSED");

    // ── Step 6: Validate results page ────────────────────────────────────────
    console.log("[Flight DSL] Step 6: Validating flight results page load...");
    const loaded = await resultsPage.waitForResultsLoaded();

    if (loaded) {
      console.log("[Flight DSL] Flight Search Results page verified successfully!");
      addStep("Results page validation", "PASSED");
      return {
        status: "PASSED",
        summary: "Flight search workflow executed successfully.",
        details: { steps: stepsReport },
      };
    } else {
      const finalUrl = await resultsPage.getCurrentUrl();
      throw new Error(`Results page did not load. Final URL: ${finalUrl}`);
    }
  } catch (error: any) {
    console.error("[Flight DSL] Error running EaseMyTrip flight search workflow:", error);
    addStep("Results page validation", "FAILED", error.message || String(error));

    try {
      const screenshotDir = path.join(__dirname, "../../screenshots");
      if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });
      screenshotPath = path.join(screenshotDir, `failure-flight-${Date.now()}.png`);
      await browser.saveScreenshot(screenshotPath);
      console.log(`[Flight DSL] Saved failure screenshot to: ${screenshotPath}`);
    } catch (ssErr) {
      console.error("[Flight DSL] Could not capture screenshot:", ssErr);
    }

    return {
      status: "FAILED",
      summary: `Flight search workflow failed because ${error.message || error}.`,
      details: { steps: stepsReport, screenshotPath },
    };
  } finally {
    console.log("[Flight DSL] Closing browser session...");
    await browser.deleteSession();
  }
}
```

### `src/dsl/hotelSearchFlow.ts`
```typescript
import fs from "fs";
import path from "path";
import { WorkflowResult } from "./flightSearchFlow.js";
import { createBrowser } from "../browser/browserFactory.js";
import { EaseMyTripHotelsPage } from "../pages/EaseMyTripHotelsPage.js";
import { HotelResultsPage } from "../pages/HotelResultsPage.js";

/**
 * validateHotelSearchFlow
 *
 * Automates EaseMyTrip hotel search validation using WebdriverIO.
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

    // ── Step 5: Validate results page ─────────────────────────────────────────
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
```

### `src/registry/workflowRegistry.ts`
```typescript
import { validateFlightSearchFlow, WorkflowResult } from "../dsl/flightSearchFlow.js";
import { validateHotelSearchFlow } from "../dsl/hotelSearchFlow.js";

export interface Workflow {
  name: string;
  description: string;
  execute: () => Promise<WorkflowResult>;
}

// Registry map exposing the workflows
export const workflowRegistry: Record<string, Workflow> = {
  validateFlightSearchFlow: {
    name: "validateFlightSearchFlow",
    description: "Validate EaseMyTrip flight search functionality.",
    execute: validateFlightSearchFlow,
  },
  validateHotelSearchFlow: {
    name: "validateHotelSearchFlow",
    description: "Validate EaseMyTrip hotel search functionality.",
    execute: validateHotelSearchFlow,
  },
};

export function getWorkflow(name: string): Workflow | undefined {
  return workflowRegistry[name];
}

export function getAllWorkflows(): Workflow[] {
  return Object.values(workflowRegistry);
}
```

### `src/executor/workflowExecutor.ts`
```typescript
import { getWorkflow } from "../registry/workflowRegistry.js";
import { WorkflowResult } from "../dsl/flightSearchFlow.js";

/**
 * Retrieves the selected workflow by name and runs its execute function.
 */
export async function executeWorkflow(workflowName: string): Promise<WorkflowResult> {
  const workflow = getWorkflow(workflowName);
  if (!workflow) {
    throw new Error(`Workflow with name '${workflowName}' not found in registry.`);
  }

  console.log(`[Workflow Executor] Execution started: ${workflowName}`);
  try {
    const result = await workflow.execute();
    return result;
  } catch (error: any) {
    console.error(`[Workflow Executor] Execution failed for ${workflowName}:`, error);
    return {
      status: "FAILED",
      summary: `Workflow execution failed: ${error.message || error}`,
      details: {
        steps: [
          {
            name: "Execution",
            status: "FAILED",
            error: error.message || String(error)
          }
        ]
      }
    };
  }
}
```

### `src/reports/reportGenerator.ts`
```typescript
export interface StepDetail {
  name: string;
  status: "PASSED" | "FAILED";
  error?: string;
}

export interface ReportDetails {
  steps?: StepDetail[];
  screenshotPath?: string;
}

/**
 * Generates a semantic, human-readable report summarizing the test execution status.
 */
export function generateReport(
  workflowName: string,
  status: "PASSED" | "FAILED",
  details?: ReportDetails,
  workflowLabel?: string
): string {
  const label = workflowLabel ?? deriveLabel(workflowName);

  if (status === "PASSED") {
    let stepsList = "";
    if (details?.steps && details.steps.length > 0) {
      const validationSteps = details.steps.filter(
        (s) => s.name !== "Open website" && s.name !== "Dismiss login modal"
      );
      const displaySteps = validationSteps.length > 0 ? validationSteps : details.steps;
      stepsList = displaySteps.map((s) => `✓ ${s.name}`).join("\n");
    } else {
      stepsList = ["✓ Search execution", "✓ Results page"].join("\n");
    }

    return `${label} executed successfully.\n\nValidated:\n${stepsList}`;
  } else {
    const failedStep = details?.steps?.find((s) => s.status === "FAILED");
    const rawError = failedStep?.error ?? "unknown error";

    let errorReason = rawError;
    if (
      rawError.includes("timeout") ||
      rawError.includes("did not load") ||
      rawError.includes("Results page did not load")
    ) {
      errorReason = "results page did not load";
    } else if (rawError.includes("not displayed")) {
      errorReason = rawError.replace(/element \(.*?\) still/, "element still");
    }

    let report = `${label} failed because ${errorReason}.`;
    if (details?.screenshotPath) {
      report += `\n\nScreenshot captured: ${details.screenshotPath}`;
    }
    return report;
  }
}

function deriveLabel(workflowName: string): string {
  const core = workflowName
    .replace(/^validate/i, "")
    .replace(/Flow$/i, "")
    .replace(/([A-Z])/g, " $1")
    .trim()
    .toLowerCase();
  return `${core.charAt(0).toUpperCase()}${core.slice(1)} workflow`;
}
```

### `src/api/routes.ts`
```typescript
import { Router, Request, Response } from "express";
import { runOrchestrator } from "../run.js";

const router = Router();

router.post("/execute", async (req: Request, res: Response): Promise<void> => {
  const { prompt } = req.body;

  if (!prompt || typeof prompt !== "string") {
    res.status(400).json({ error: "Missing or invalid 'prompt' field in request body." });
    return;
  }

  try {
    const result = await runOrchestrator(prompt);
    res.json(result);
  } catch (error: any) {
    console.error(`[Router] Error during request orchestration:`, error);
    res.status(500).json({
      error: "Internal server error during test orchestration",
      details: error.message || String(error)
    });
  }
});

export default router;
```

---

## 4. Developer Utilities

### `src/debug-calendar.ts`
```typescript
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

    const delhiItem = await browser.$("//li[contains(normalize-space(.), 'Delhi')]");
    await delhiItem.click();
    await browser.pause(2000);

    console.log("\n=== CALENDAR DOM INSPECTION ===");

    const iframes = await browser.$$("iframe");
    const iframesLen = await iframes.length;
    console.log(`\nNumber of iframes: ${iframesLen}`);
    for (let i = 0; i < iframesLen; i++) {
      const src = await iframes[i].getAttribute("src") || "(no src)";
      const id = await iframes[i].getAttribute("id") || "(no id)";
      const cls = await iframes[i].getAttribute("class") || "(no class)";
      console.log(`  iframe[${i}]: id="${id}" class="${cls}" src="${src}"`);
    }

    const tds = await browser.$$("td");
    const tdsLen = await tds.length;
    console.log(`\nTotal TDs found: ${tdsLen}`);

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
      } catch (e) {}
    }

    console.log("\n=== overlaybg1 full HTML (first 2000 chars) ===");
    const overlay = await browser.execute(() => {
      const el = document.getElementById("overlaybg1");
      return el ? el.outerHTML.substring(0, 2000) : "NOT FOUND";
    });
    console.log(overlay);

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
```

### `src/debug-selector.ts`
```typescript
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

    const inputsAfterFrom = await browser.$$("input");
    for (const input of inputsAfterFrom) {
      if (await input.isDisplayed()) {
        console.log(`Active Input: ID: ${await input.getAttribute("id")}, Class: ${await input.getAttribute("class")}, Value: ${await input.getValue()}`);
      }
    }

    console.log("Typing 'Pune'...");
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
    
    console.log("Clicking Delhi suggestion via JS...");
    await browser.execute((el) => (el as any).click(), targetDelhiLi);
    console.log("Delhi suggestion clicked!");
    await browser.pause(2000);

    const toInputVal = await browser.$("#Editbox13_show").getValue();
    const a_toInputVal = await browser.$("#a_Editbox13_show").getValue();
    console.log(`Editbox13_show value: ${toInputVal}`);
    console.log(`a_Editbox13_show value: ${a_toInputVal}`);

    console.log("Inspecting date field parent...");
    const dateTrigger = await browser.$("#ddate");
    const parent = await dateTrigger.parentElement();
    console.log(`dateTrigger parent tag: <${await parent.getTagName()}>, class: ${await parent.getAttribute("class")}`);
    console.log(`parent outer HTML:\n${await parent.getHTML()}`);
    
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
```

### `src/inspectExpedia.ts`
```typescript
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
```

---

## 5. Setup & Launch Instructions for the Recreation AI

When creating this project:
1. Initialize the project: `npm init -y`
2. Create folders: `mkdir -p src/browser src/ai src/pages src/dsl src/registry src/executor src/reports src/api`
3. Write files with their exact contents as specified above.
4. Run `npm install` to install dependencies.
5. Create a local `.env` file based on `.env.example`.
6. To run locally without AWS credentials (recommended for testing), ensure `BYPASS_BEDROCK=true` is set in `.env`. Set `CHROME_BINARY` to your environment's Chrome path if not on macOS.
7. Run the CLI tool:
   - For Flight search validation: `npm run orchestrate -- "Validate flight search from Pune to Delhi"`
   - For Hotel search validation: `npm run orchestrate -- "Validate hotel search in Mumbai"`
8. Run the HTTP Express API:
   - Start: `npm run dev`
   - Trigger via HTTP POST:
     ```bash
     curl -X POST http://localhost:3000/execute \
       -H "Content-Type: application/json" \
       -d '{"prompt": "Validate flight search from Pune to Delhi"}'
     ```
