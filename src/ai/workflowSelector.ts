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
