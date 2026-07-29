/**
 * Backfill unique `slug` on all Trainer documents missing one.
 * Usage: node scripts/backfill-trainer-slugs.mjs
 * Requires MONGODB_URI in .env.local (loaded via dotenv if present).
 */
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
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

const uri = process.env.MONGODB_URI
if (!uri) {
  console.error('MONGODB_URI is required')
  process.exit(1)
}

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
