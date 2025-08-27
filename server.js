// server.js
import express from "express";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());

// 🌸 Routes
app.get("/", (req, res) => {
    res.send("Welcome to my cozy Express app! 💕");
});

app.get("/api/users", (req, res) => {
    res.json([
        { id: 1, name: "Alice" },
        { id: 2, name: "Bob" },
    ]);
});

app.get("/api/products", (req, res) => {
    res.json([
        { id: 1, name: "Laptop", price: 1200 },
        { id: 2, name: "Phone", price: 800 },
    ]);
});

app.post("/api/contact", (req, res) => {
    const { name, message } = req.body;
    res.json({ status: "success", name, message });
});
 
// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT} 💖`);
});
