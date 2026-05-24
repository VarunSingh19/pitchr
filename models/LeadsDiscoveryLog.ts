import mongoose, { Schema, model, models, type Document } from "mongoose";

export interface ILeadsDiscoveryLog extends Document {
  userId: mongoose.Types.ObjectId;
  query: string;
  location: string;
  createdAt: Date;
}

const LeadsDiscoveryLogSchema = new Schema<ILeadsDiscoveryLog>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    query: { type: String, required: true },
    location: { type: String, default: "" },
  },
  {
    timestamps: { createdAt: "createdAt", updatedAt: false },
  }
);

const LeadsDiscoveryLog =
  models.LeadsDiscoveryLog ||
  model<ILeadsDiscoveryLog>("LeadsDiscoveryLog", LeadsDiscoveryLogSchema);

export default LeadsDiscoveryLog;
