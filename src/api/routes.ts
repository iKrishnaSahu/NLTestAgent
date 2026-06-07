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
