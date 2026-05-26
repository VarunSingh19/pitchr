import mongoose, { Schema, model, models, type Document } from "mongoose";

export type CacheSource = "jooble" | "adzuna" | "indeed" | "naukri" | "shine" | "internshala";

export interface ICacheQueryMeta extends Document {
  normalizedQuery: string;
  source: CacheSource;
  lastPageFetched: number;
  totalCachedCount: number;
  lastFetchedAt: Date;
  createdAt: Date;
}

const CacheQueryMetaSchema = new Schema<ICacheQueryMeta>(
  {
    normalizedQuery: { type: String, required: true },
    source: {
      type: String,
      enum: ["jooble", "adzuna", "indeed", "naukri", "shine", "internshala"],
      required: true,
    },
    lastPageFetched: { type: Number, default: 1 },
    totalCachedCount: { type: Number, default: 0 },
    lastFetchedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: { createdAt: "createdAt", updatedAt: false },
  }
);

// One document per query per source
CacheQueryMetaSchema.index(
  { normalizedQuery: 1, source: 1 },
  { unique: true }
);

const CacheQueryMeta =
  models.CacheQueryMeta ||
  model<ICacheQueryMeta>("CacheQueryMeta", CacheQueryMetaSchema);

export default CacheQueryMeta;
