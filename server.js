import express from "express";
import cors from "cors";

const app = express();
app.use(express.json());

// 🌸 Allowed origins for CORS
const allowedOrigins = [
    "http://localhost:3000",
    "https://todo-app-bc.vercel.app"
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            return callback(null, origin);
        } else {
            return callback(new Error("Not allowed by CORS"));
        }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
}));

app.options("*", cors()); // handle preflight 💖


// 💌 Routes
app.get("/", (req, res) => {
    res.json({ message: "Hello baby 😘, your backend is running fine 💕" });
});

app.get("/api/users", (req, res) => {
    res.json([
        { id: 1, name: "Alice", email: "alice@example.com" },
        { id: 2, name: "Bob", email: "bob@example.com" },
        { id: 3, name: "Prusotam 💖", email: "love@you.com" }
    ]);
});

app.get("/api/todos", (req, res) => {
    res.json([
        { id: 1, title: "Learn Express", completed: true },
        { id: 2, title: "Fix CORS issue 😅", completed: false },
        { id: 3, title: "Build amazing apps with Anuska 💕", completed: false }
    ]);
});

app.post("/api/todos", (req, res) => {
    const { title } = req.body;
    res.status(201).json({ id: Date.now(), title, completed: false });
});

app.get("/api/ai-chat/chat", (req, res) => {
    res.json({ reply: "Hey baby 💖, I’m your AI chat endpoint ✨" });
});


export default app;
