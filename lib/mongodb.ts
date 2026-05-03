/**
 * Singleton MongoClient connection for Auth.js adapter.
 * Uses global cache to prevent connection leaks during HMR in development.
 */
import { MongoClient } from "mongodb";

const MONGO_URL = process.env.MONGO_URL;

if (!MONGO_URL) {
  throw new Error("Please define the MONGO_URL environment variable");
}

interface MongoClientCache {
  client: MongoClient | null;
  promise: Promise<MongoClient> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: MongoClientCache | undefined;
}

let cached: MongoClientCache = global._mongoClientPromise || {
  client: null,
  promise: null,
};

if (!global._mongoClientPromise) {
  global._mongoClientPromise = cached;
}

function getClientPromise(): Promise<MongoClient> {
  if (cached.client) {
    return Promise.resolve(cached.client);
  }

  if (!cached.promise) {
    cached.promise = new MongoClient(MONGO_URL!).connect().then((client) => {
      cached.client = client;
      return client;
    });
  }

  return cached.promise;
}

const clientPromise: Promise<MongoClient> = getClientPromise();

export default clientPromise;
