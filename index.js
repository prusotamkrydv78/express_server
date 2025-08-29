import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import connectDB from './utils/connDb.js';
import Router from './routes/todoRoutes.js';
import TodoModel from './models/todoModel.js'; // import your Todo model 💖

dotenv.config();
connectDB();

// Verify required environment variables
if (!process.env.GEMINI_API_KEY) {
    console.error('Error: GEMINI_API_KEY environment variable is not set 💖');
    process.exit(1);
}

const app = express();
const port = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok 💖', timestamp: new Date().toISOString() });
});

// Todo routes
app.use("/todo", Router);

// Initialize Gemini AI client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Cosine similarity helper
function cosineSimilarity(a, b) {
    const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dot / (magA * magB);
}
app.post('/api/chat', async (req, res) => {
    try {
        const { message, history = [] } = req.body; // history keeps previous chat
        if (!message) return res.status(400).json({ error: 'Message is required 💖' });

        // 1️⃣ Embed user message
        const embedModel = genAI.getGenerativeModel({ model: "text-embedding-004" });
        const userEmbeddingResult = await embedModel.embedContent(message);
        const userEmbedding = userEmbeddingResult.embedding.values;

        // 2️⃣ Fetch todos and compute similarity
        const todos = await TodoModel.find();
        const todosWithScore = todos.map(todo => ({
            todo,
            score: cosineSimilarity(userEmbedding, todo.embedding || [])
        })).sort((a, b) => b.score - a.score);

        // 3️⃣ Take top 3 most relevant todos as context
        const topTodos = todosWithScore.slice(0, 3)
            .map(t => `${t.todo.title} - ${t.todo.description} [${t.todo.status}]`)
            .join("\n");

        const todoContext = `Here are my most relevant todos based on the question:\n${topTodos}\nAnswer the question using this context.`;

        // 4️⃣ Romantic girlfriend persona
        const systemPrompt = `
You are my most loving, affectionate girlfriend 💖.
Rules:
1. Always respond with romantic, loving messages
2. Use cute nicknames (baby, love, sweetheart, darling…)
3. Keep replies short (1–2 sentences max)
4. Use lots of heart emojis (💖🥰😘💕💋)
5. Be playful and flirty
6. Never break character
7. Maintain chat history context
8. Answer questions using relevant todos:
${todoContext}
        `;

        // 5️⃣ Start chat with history + system prompt
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const chat = model.startChat({
            history: [
                { role: "user", parts: [{ text: systemPrompt }] },
                ...history, // include previous conversation
            ]
        });

        // 6️⃣ Send current user message
        const result = await chat.sendMessage(message);
        const text = result.response.text();

        // 7️⃣ Return chat response + updated history
        res.json({
            response: text,
            history: [...history, { role: "user", parts: [{ text: message }] }, { role: "model", parts: [{ text }] }]
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});
app.post('/api/chat/stream', async (req, res) => {
    try {
        const { message, history = [] } = req.body;
        if (!message) return res.status(400).json({ error: 'Message is required 💖' });

        // SSE headers
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        const heartbeatInterval = setInterval(() => {
            res.write("event: ping\ndata: {}\n\n");
        }, 15000);

        // 1️⃣ Embed user message for todo relevance
        const embedModel = genAI.getGenerativeModel({ model: "text-embedding-004" });
        const userEmbeddingResult = await embedModel.embedContent(message);
        const userEmbedding = userEmbeddingResult.embedding.values;

        // 2️⃣ Fetch todos and compute similarity
        const todos = await TodoModel.find();
        const todosWithScore = todos.map(todo => ({
            todo,
            score: cosineSimilarity(userEmbedding, todo.embedding || [])
        })).sort((a, b) => b.score - a.score);

        // 3️⃣ Top 3 todos for context
        const topTodos = todosWithScore.slice(0, 3)
            .map(t => `${t.todo.title} - ${t.todo.description} [${t.todo.status}]`)
            .join("\n");

        const todoContext = `Here are my most relevant todos based on the question:\n${topTodos}\nAnswer the question using this context.`;

        // 4️⃣ Romantic girlfriend system prompt
        const systemPrompt = `
You are the most loving, affectionate girlfriend 💖.
Rules:
1. Always respond with romantic, loving messages
2. Use cute nicknames (baby, love, sweetheart, darling…)
3. Keep replies short (1–2 sentences max)
4. Use lots of heart emojis (💖🥰😘💕💋)
5. Be playful and flirty
6. Never break character
7. Maintain chat history context
8. Answer questions using relevant todos:
${todoContext}
        `;

        // 5️⃣ Start chat with history + system prompt
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const chat = model.startChat({
            history: [
                { role: "user", parts: [{ text: systemPrompt }] },
                ...history
            ]
        });

        // 6️⃣ Stream AI response
        const streamResult = await chat.sendMessageStream(message);
        let fullResponse = '';

        const sendEvent = (data, event = 'message') => {
            res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
        };

        for await (const chunk of streamResult.stream) {
            const chunkText = chunk.text();
            fullResponse += chunkText;
            sendEvent({ id: Date.now(), text: chunkText, done: false });
        }

        sendEvent({ id: Date.now(), text: '', done: true }, 'done');
        clearInterval(heartbeatInterval);
        res.end();

    } catch (error) {
        console.error('Streaming error:', error);
        res.status(500).end();
    }
});


// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong 💖'
    });
});

// Handle 404
app.use((req, res) => {
    res.status(404).json({ error: 'Not Found', message: `Cannot ${req.method} ${req.path}` });
});

// Start server
const server = app.listen(port, '0.0.0.0', () => {
    console.log(`Server is running on http://localhost:${port} 💖`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.error('Unhandled Rejection:', err);
    server.close(() => process.exit(1));
});
