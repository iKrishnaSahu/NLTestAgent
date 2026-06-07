import { runOrchestrator } from "./run";
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
