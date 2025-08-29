import mongoose,{Schema} from "mongoose";
const documentSchema = new Schema({
    text: String,
    embedding: [Number] // Gemini embeddings are numeric arrays
  });
  
  const Document = mongoose.model("Document", documentSchema);
  export default Document