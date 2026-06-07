import express from "express";
import router from "./api/routes.js";

const app = express();

// Middleware for parsing JSON request bodies
app.use(express.json());

// Mount API routes
app.use("/", router);

export default app;
