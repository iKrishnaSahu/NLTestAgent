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
