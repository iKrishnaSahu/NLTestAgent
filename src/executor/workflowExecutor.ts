import { getWorkflow } from "../registry/workflowRegistry";
import { WorkflowResult } from "../dsl/flightSearchFlow";

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
