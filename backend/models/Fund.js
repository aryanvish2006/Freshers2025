import mongoose from "mongoose";

const fundSchema = new mongoose.Schema({
  type: { type: String, enum: ["add", "withdraw"], required: true },
  amount: { type: Number, required: true },
  source: { type: String, default: "token" }, // token / external / expense
  reason: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Fund", fundSchema);
