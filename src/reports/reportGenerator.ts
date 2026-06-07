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
 *
 * @param workflowName  - The registered workflow name (e.g. "validateFlightSearchFlow")
 * @param status        - Overall PASSED / FAILED result
 * @param details       - Optional step-level breakdown and screenshot path
 * @param workflowLabel - Optional human-readable label (e.g. from registry description).
 *                        Falls back to a capitalized derivation of the workflow name.
 */
export function generateReport(
  workflowName: string,
  status: "PASSED" | "FAILED",
  details?: ReportDetails,
  workflowLabel?: string
): string {
  // Derive a readable label from the workflow name if none provided.
  // e.g. "validateFlightSearchFlow" → "Flight search workflow"
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

    // Normalize verbose error messages to concise user-friendly text
    let errorReason = rawError;
    if (
      rawError.includes("timeout") ||
      rawError.includes("did not load") ||
      rawError.includes("Results page did not load")
    ) {
      errorReason = "results page did not load";
    } else if (rawError.includes("not displayed")) {
      // e.g. "element (#foo) still not displayed after 15000ms"
      errorReason = rawError.replace(/element \(.*?\) still/, "element still");
    }

    let report = `${label} failed because ${errorReason}.`;
    if (details?.screenshotPath) {
      report += `\n\nScreenshot captured: ${details.screenshotPath}`;
    }
    return report;
  }
}

/**
 * Derives a readable workflow label from its camelCase name.
 * "validateFlightSearchFlow" → "Flight search workflow"
 * "validateHotelSearchFlow"  → "Hotel search workflow"
 */
function deriveLabel(workflowName: string): string {
  // Strip "validate" prefix and "Flow" suffix, split on capitals
  const core = workflowName
    .replace(/^validate/i, "")
    .replace(/Flow$/i, "")
    .replace(/([A-Z])/g, " $1")
    .trim()
    .toLowerCase();
  return `${core.charAt(0).toUpperCase()}${core.slice(1)} workflow`;
}
