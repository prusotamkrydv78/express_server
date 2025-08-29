import mongoose from "mongoose";

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MongoDB_URI);
    console.log("Database is connected");
  } catch (error) {
    console.log("ERROR Connectig DB: - ", error);
  }
};


export default connectDB;