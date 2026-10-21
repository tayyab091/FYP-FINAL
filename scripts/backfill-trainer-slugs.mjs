/**
 * Backfill unique `slug` on all Trainer documents missing one.
 * Usage: node scripts/backfill-trainer-slugs.mjs
 * Requires MONGODB_URI in .env.local (loaded via dotenv if present).
 */
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Resolver } from 'node:dns/promises'
import mongoose from 'mongoose'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dirname, '../.env.local')
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/)
    if (m && !process.env[m[1].trim()]) {
      process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '')
    }
  }
}

const rawUri = process.env.MONGODB_URI
if (!rawUri) {
  console.error('MONGODB_URI is required')
  process.exit(1)
}

/**
 * Convert mongodb+srv:// to a direct mongodb:// URI so the driver never calls
 * querySrv against a broken system resolver (common on Windows ISPs).
 * Mirrors src/lib/mongodb.ts so this standalone script behaves the same way.
 */
async function toDirectMongoUri(uri) {
  if (!uri.startsWith('mongodb+srv://')) return uri

  const resolver = new Resolver()
  resolver.setServers(['8.8.8.8', '1.1.1.1'])

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

  return `mongodb://${credentials}@${hosts}${dbPath}?${params.toString()}`
}

const uri = await toDirectMongoUri(rawUri)

function slugifyTrainerName(name) {
  const base = name
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
  return base || 'trainer'
}

const TrainerSchema = new mongoose.Schema({
  name: String,
  slug: { type: String, unique: true, sparse: true },
})
const Trainer = mongoose.models.Trainer || mongoose.model('Trainer', TrainerSchema)

async function allocateSlug(name, excludeId) {
  const base = slugifyTrainerName(name)
  let candidate = base
  let suffix = 2
  while (true) {
    const query = { slug: candidate }
    if (excludeId) query._id = { $ne: excludeId }
    const taken = await Trainer.findOne(query).select('_id').lean()
    if (!taken) return candidate
    candidate = `${base}-${suffix}`
    suffix += 1
  }
}

async function main() {
  await mongoose.connect(uri)
  const missing = await Trainer.find({
    $or: [{ slug: { $exists: false } }, { slug: null }, { slug: '' }],
  }).select('_id name')

  let updated = 0
  for (const doc of missing) {
    const slug = await allocateSlug(doc.name || 'trainer', doc._id)
    await Trainer.updateOne({ _id: doc._id }, { $set: { slug } })
    updated += 1
    console.log(`✓ ${doc.name} → ${slug}`)
  }

  console.log(`Done. Backfilled ${updated} trainer slug(s).`)
  await mongoose.disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
