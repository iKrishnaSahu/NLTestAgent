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
