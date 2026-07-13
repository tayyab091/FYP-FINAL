import { Resolver } from 'dns/promises'
import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI!

if (!MONGODB_URI) {
  throw new Error('Please define MONGODB_URI in .env.local')
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

function googleResolver() {
  const resolver = new Resolver()
  resolver.setServers(['8.8.8.8', '1.1.1.1'])
  return resolver
}

/**
 * Convert mongodb+srv:// to a direct mongodb:// URI so the driver never calls
 * querySrv against a broken system resolver (common on Windows ISPs).
 */
async function toDirectMongoUri(uri: string): Promise<string> {
  if (!uri.startsWith('mongodb+srv://')) return uri
  if (global.mongooseCache.resolvedUri) return global.mongooseCache.resolvedUri

  const rest = uri.slice('mongodb+srv://'.length)
  const at = rest.lastIndexOf('@')
  const credentials = at >= 0 ? rest.slice(0, at) : ''
  const afterAt = at >= 0 ? rest.slice(at + 1) : rest

  const qIdx = afterAt.indexOf('?')
  const pathPart = qIdx >= 0 ? afterAt.slice(0, qIdx) : afterAt
  const query = qIdx >= 0 ? afterAt.slice(qIdx + 1) : ''

  const slash = pathPart.indexOf('/')
  const hostname = slash >= 0 ? pathPart.slice(0, slash) : pathPart
  const dbPath = slash >= 0 ? pathPart.slice(slash) : '/'

  const resolver = googleResolver()
  const srv = await resolver.resolveSrv(`_mongodb._tcp.${hostname}`)
  if (!srv.length) throw new Error(`No SRV records for ${hostname}`)

  const hosts = srv
    .sort((a, b) => a.priority - b.priority || b.weight - a.weight)
    .map((r) => `${r.name}:${r.port}`)
    .join(',')

  const params = new URLSearchParams(query)
  params.set('ssl', 'true')
  if (!params.has('authSource')) params.set('authSource', 'admin')
  if (!params.has('retryWrites')) params.set('retryWrites', 'true')

  try {
    const txt = await resolver.resolveTxt(hostname)
    for (const chunk of txt) {
      const line = chunk.join('')
      for (const pair of line.split('&')) {
        const [k, v] = pair.split('=')
        if (k && v && !params.has(k)) params.set(k, v)
      }
    }
  } catch {
    // TXT is optional
  }

  const direct = `mongodb://${credentials}@${hosts}${dbPath}?${params.toString()}`
  global.mongooseCache.resolvedUri = direct
  return direct
}

export async function connectDB() {
  if (global.mongooseCache.conn) {
    return global.mongooseCache.conn
  }

  if (!global.mongooseCache.promise) {
    global.mongooseCache.promise = (async () => {
      const uri = await toDirectMongoUri(MONGODB_URI)
      return mongoose.connect(uri, { bufferCommands: false })
    })().catch((err) => {
      global.mongooseCache.promise = null
      global.mongooseCache.resolvedUri = null
      throw err
    })
  }

  global.mongooseCache.conn = await global.mongooseCache.promise
  return global.mongooseCache.conn
}
