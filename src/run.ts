import { selectWorkflow } from "./ai/workflowSelector";
import { executeWorkflow } from "./executor/workflowExecutor";
import { generateReport } from "./reports/reportGenerator";

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
