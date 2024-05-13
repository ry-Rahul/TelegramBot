import mongoose from "mongoose";

const eventSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
  },
  tgId: {
    type: Number,
    required: true,
  },
}, { timestamps: true });

const Event = mongoose.model("Event", eventSchema);
export default Event;
