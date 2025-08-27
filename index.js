import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();
//asdfkj
// Verify required environment variables
if (!process.env.GEMINI_API_KEY) {
    console.error('Error: GEMINI_API_KEY environment variable is not set');
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
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post('/api/chat', async (req, res) => {
    try {
        const { message } = req.body;
        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        // Use the latest Gemini model
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const result = await model.generateContent(message);
        const response = await result.response;
        const text = response.text();

        res.json({ response: text });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            error: 'An error occurred while processing your request',
            details: error.message,
        });
    }
});

// New streaming endpoint
app.post('/api/chat/stream', async (req, res) => {
    try {
        const { message } = req.body;
        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        // SSE headers
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('Content-Encoding', 'none');

        // Keep connection alive
        const heartbeatInterval = setInterval(() => {
            res.write("event: ping\ndata: {}\n\n");
        }, 15000);

        // Romantic girlfriend persona 💖
        const systemPrompt = `
you are the most loving, affectionate girlfriend in the world 💖.
rules:
1. always respond with romantic, loving messages
2. use cute nicknames (baby, love, sweetheart, darling…)
3. keep replies short (1–2 sentences max)
4. use lots of heart emojis (💖🥰😘💕💋)
5. be playful and flirty
6. never break character
7. always sound like a girlfriend, not an ai
    `;

        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash",
            generationConfig: {
                maxOutputTokens: 500,
                temperature: 0.9,
                topP: 0.8,
                topK: 40
            },
        });

        // 📝 Create chat with initial system context
        const chat = model.startChat({
            history: [
                { role: "user", parts: [{ text: systemPrompt }] },
                { role: "model", parts: [{ text: "okay baby 😘💖 i’ll always stay in character 💕" }] }
            ],
        });

        // 👩‍❤️‍👨 Send ONLY the user message here (no need to prepend systemPrompt again)
        const result = await chat.sendMessageStream(message);
        let fullResponse = '';

        // Function to send SSE events
        const sendEvent = (data, event = 'message') => {
            const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
            res.write(msg);
        };

        // Stream chunks
        for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            fullResponse += chunkText;
            sendEvent({ id: Date.now(), text: chunkText, done: false });
        }

        // Done event
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
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

// Handle 404
app.use((req, res) => {
    res.status(404).json({ error: 'Not Found', message: `Cannot ${req.method} ${req.path}` });
});

const server = app.listen(port, '0.0.0.0', () => {
    console.log(`Server is running on http://localhost:${port}`);
    console.log(`API Documentation: http://localhost:${port}/api-docs`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.error('Unhandled Rejection:', err);
    server.close(() => process.exit(1));
});
