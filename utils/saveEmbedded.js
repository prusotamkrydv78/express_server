import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "text-embedding-004" });

async function storeEmbedding(text) {
  const result = await model.embedContent(text);
  const embedding = result.embedding.values;

  const doc = new Document({ text, embedding });
  await doc.save();

  console.log("💌 Saved embedding for:", text);
}
 
export default storeEmbedding
