import { validateFlightSearchFlow, WorkflowResult } from "../dsl/flightSearchFlow";
import { validateHotelSearchFlow } from "../dsl/hotelSearchFlow";

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
