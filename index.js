import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

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

        // Set headers for SSE
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('Content-Encoding', 'none');

        // Get the Gemini model
        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash",
            generationConfig: {
                maxOutputTokens: 1000,
            },
        });

        // Send a heartbeat every 15 seconds to keep the connection alive
        const heartbeatInterval = setInterval(() => {
            res.write('\n');
        }, 15000);

        // Function to send SSE messages
        const sendEvent = (data, event = 'message') => {
            const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
            res.write(message);
        };

        try {
            // Start a chat session
            const chat = model.startChat({
                history: [],
                generationConfig: {
                    maxOutputTokens: 1000,
                },
            });

            // Get the streaming result
            const result = await chat.sendMessageStream(message);
            let fullResponse = '';

            // Stream the response
            for await (const chunk of result.stream) {
                const chunkText = chunk.text();
                fullResponse += chunkText;

                // Send each chunk as it arrives
                sendEvent({
                    id: Date.now(),
                    text: chunkText,
                    done: false
                });
            }

            // Send completion event
            sendEvent({
                id: Date.now(),
                text: '',
                done: true
            }, 'done');

        } catch (error) {
            console.error('Streaming error:', error);
            sendEvent({
                error: 'An error occurred during streaming',
                details: error.message
            }, 'error');
        } finally {
            clearInterval(heartbeatInterval);
            res.end();
        }

    } catch (error) {
        console.error('Error setting up streaming:', error);
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
