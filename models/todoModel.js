import mongoose,{Schema} from "mongoose";

const todoSchema = new Schema({
    title:{
        type:String,
        required:true
    } ,
    status:{
        type:String,
        default:true
    },
    priority:{
        type:String,
        required:true
    },
    createdAt:{
        type:Date,
        default:Date.now
    },
    embedding: [Number] 
})

const TodoModel = mongoose.model("Todo",todoSchema)
export default TodoModel