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
