import express from "express";
import TodoModel from "../models/todoModel.js";
import { GoogleGenerativeAI } from "@google/generative-ai";

const Router = express.Router();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Cosine similarity helper
function cosineSimilarity(a, b) {
  const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dot / (magA * magB);
}

// GET all todos
Router.get("/", async (req, res) => {
  const data = await TodoModel.find();
  res.json({ success: true, message: "Todos fetched 💖", data });
});

// POST new todo with embedding
Router.post("/", async (req, res) => {
  const { title,  status, priority } = req.body;
  try {
    // 1️⃣ Check that title/description exist
    if (!title) {
      return res.status(400).json({ success: false, message: "Title and description are required 💖" });
    }

    // 2️⃣ Generate embedding
    const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
    const textToEmbed = `${title} - [${status}]`;
    const result = await model.embedContent(textToEmbed);

    // 3️⃣ Ensure embedding exists
    const embeddingValues = result.embedding?.values || [];
    if (!embeddingValues.length) {
      return res.status(500).json({ success: false, message: "Failed to generate embedding 💔" });
    }

    // 4️⃣ Save todo with embedding
    const todo = new TodoModel({
      title, 
      status,
      priority,
      embedding: embeddingValues
    });
    await todo.save();

    res.json({ success: true, message: "Todo saved with embedding 💖", data: todo });
  } catch (error) {
    console.error("Error saving todo with embedding:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE todo
Router.delete("/:id", async (req, res) => {
  try {
    await TodoModel.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Todo deleted 💖" });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
});

// UPDATE todo
Router.put("/:id", async (req, res) => {
  try {
    await TodoModel.findByIdAndUpdate(req.params.id, req.body);
    res.json({ success: true, message: "Todo updated 💖" });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
});

export default Router;
