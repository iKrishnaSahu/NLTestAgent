import app from "./app";
import dotenv from "dotenv";

dotenv.config();

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`[Server] AI Semantic Test Orchestration server is running at http://localhost:${port}`);
});
