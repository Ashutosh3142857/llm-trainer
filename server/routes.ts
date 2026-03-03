import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { models } from "@shared/schema";
import multer from "multer";

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'text/plain' || file.originalname.endsWith('.txt') || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only .txt and .csv files are allowed'));
    }
  }
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.get(api.models.list.path, async (req, res) => {
    const allModels = await storage.getModels();
    res.json(allModels);
  });

  app.get(api.models.get.path, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(404).json({ message: "Invalid ID" });

    const model = await storage.getModel(id);
    if (!model) return res.status(404).json({ message: "Model not found" });

    res.json(model);
  });

  app.post(api.models.create.path, async (req, res) => {
    try {
      const input = api.models.create.input.parse(req.body);
      const model = await storage.createModel(input);
      res.status(201).json(model);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join("."),
        });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/models/upload", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      const dataset = req.file.buffer.toString("utf-8");
      if (!dataset.trim()) {
        return res.status(400).json({ message: "File is empty" });
      }
      const validated = api.models.create.input.parse({
        name: req.body.name,
        dataset,
        totalSteps: req.body.totalSteps ? parseInt(req.body.totalSteps) : 1000,
      });
      const model = await storage.createModel(validated);
      res.status(201).json(model);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Upload failed" });
    }
  });

  app.delete(api.models.delete.path, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(404).json({ message: "Invalid ID" });
    
    await storage.deleteModel(id);
    res.status(204).send();
  });

  app.post(api.models.train.path, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(404).json({ message: "Invalid ID" });

    const model = await storage.getModel(id);
    if (!model) return res.status(404).json({ message: "Model not found" });
    if (model.status === "training") {
      return res.status(400).json({ message: "Model is already training" });
    }

    // Save dataset to a temporary file
    const datasetPath = path.join(process.cwd(), `dataset_${id}.txt`);
    fs.writeFileSync(datasetPath, model.dataset);

    // Update status
    await storage.updateModel(id, { status: "training", currentStep: 0, currentLoss: 0 });

    res.json({ message: "Training started" });

    // Start training in background
    const processEnv = { ...process.env, PYTHONUNBUFFERED: "1" };
    const child = spawn("python", ["custom_llm.py", "train", id.toString(), datasetPath, (model.totalSteps || 1000).toString()], {
      env: processEnv
    });

    child.stdout.on("data", async (data) => {
      const output = data.toString();
      const lines = output.split('\n');
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const parsed = JSON.parse(line);
          if (parsed.status === "done") {
            await storage.updateModel(id, { status: "trained" });
            if (fs.existsSync(datasetPath)) fs.unlinkSync(datasetPath);
          } else if (parsed.step) {
            await storage.updateModel(id, { currentStep: parsed.step, currentLoss: parsed.loss });
          }
        } catch (e) {
          // Ignore non-JSON output
        }
      }
    });

    child.stderr.on("data", (data) => {
      console.error(`Training error for model ${id}:`, data.toString());
    });

    child.on("close", async (code) => {
      if (fs.existsSync(datasetPath)) fs.unlinkSync(datasetPath);
      // Double check status if it crashed
      const m = await storage.getModel(id);
      if (m && m.status === "training") {
        await storage.updateModel(id, { status: "created" }); // Reset on crash
      }
    });
  });

  app.post(api.models.inference.path, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(404).json({ message: "Invalid ID" });

    const model = await storage.getModel(id);
    if (!model) return res.status(404).json({ message: "Model not found" });
    if (model.status !== "trained") {
      return res.status(400).json({ message: "Model is not trained yet" });
    }

    try {
      const input = api.models.inference.input.parse(req.body);
      
      return new Promise((resolve, reject) => {
        const child = spawn("python", ["custom_llm.py", "infer", id.toString(), input.temperature.toString(), input.numSamples.toString()]);
        
        let output = "";
        child.stdout.on("data", (data) => {
          output += data.toString();
        });
        
        child.stderr.on("data", (data) => {
          console.error(`Inference error for model ${id}:`, data.toString());
        });
        
        child.on("close", (code) => {
          try {
            // Find the last valid JSON in output (there might be warnings printed before)
            const lines = output.trim().split('\n');
            const lastLine = lines[lines.length - 1];
            const result = JSON.parse(lastLine);
            res.json({ samples: result.samples });
          } catch (e) {
            res.status(500).json({ message: "Failed to parse inference output" });
          }
        });
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join("."),
        });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  return httpServer;
}
