import mongoose from 'mongoose'

function getMongoUri(): string {
  const uri = process.env.MONGODB_URI
  if (!uri) {
    throw new Error('Please define MONGODB_URI in environment variables')
  }
  return uri
}

declare global {
  var mongooseCache: {
    conn: typeof mongoose | null
    promise: Promise<typeof mongoose> | null
    resolvedUri: string | null
  }
}

if (!global.mongooseCache) {
  global.mongooseCache = { conn: null, promise: null, resolvedUri: null }
}

export async function connectDB() {
  if (global.mongooseCache.conn) {
    return global.mongooseCache.conn
  }

  if (!global.mongooseCache.promise) {
    global.mongooseCache.promise = (async () => {
      return mongoose.connect(getMongoUri(), {
        bufferCommands: false,
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 5000,
        maxPoolSize: 10,
      })
    })().catch((err) => {
      global.mongooseCache.promise = null
      global.mongooseCache.resolvedUri = null
      throw err
    })
  }

  global.mongooseCache.conn = await global.mongooseCache.promise
  return global.mongooseCache.conn
}

/**
 * Public discovery pages should not remain blank while an optional database
 * connection is unavailable. The underlying shared connection keeps running,
 * while this caller can fall back to preview data after a short deadline.
 */
export async function connectDBWithTimeout(timeoutMs = 5000) {
  let timeout: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      connectDB(),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new Error('Database connection timed out')), timeoutMs)
      }),
    ])
  } finally {
    if (timeout) clearTimeout(timeout)
  }
}
