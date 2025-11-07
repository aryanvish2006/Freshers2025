import mongoose from "mongoose";

const tokenSchema = new mongoose.Schema({
  token: { type: String, required: true, unique: true },
  assigned: { type: Boolean, default: false },
  name: { type: String, default: null },
  roll: { type: String, default: null },
  entered: { type: Boolean, default: false },
  price: { type: Number, default: 0 },
  assignedAt: { type: Date },
  enteredAt: { type: Date },
});

export default mongoose.model("Token", tokenSchema);
