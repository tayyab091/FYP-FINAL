import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises'
import { setTimeout as delay } from 'node:timers/promises'

// Keep the library usable on cold starts and during ExerciseDB outages.
// Refresh deliberately instead of crawling 60 API pages in a user's request.
const saved = await readFile('.perf-artifacts/exercise-download.json', 'utf8').then(JSON.parse).catch(() => ({ exercises: [], cursor: undefined }))
const exercises = saved.exercises
let cursor = saved.cursor
for (let page = 0; page < 70; page++) {
  const url = new URL('https://oss.exercisedb.dev/api/v1/exercises')
  url.searchParams.set('limit', '25')
  if (cursor) url.searchParams.set('after', cursor)
  let response
  for (let attempt = 0; attempt < 4; attempt++) {
    response = await fetch(url, { signal: AbortSignal.timeout(15000) })
    if (response.status !== 429 || attempt === 3) break
    const seconds = Number(response.headers.get('retry-after')) || 30
    console.log(`Exercise API rate limit; waiting ${seconds}s before retrying`)
    await delay(seconds * 1000)
  }
  if (!response.ok) throw new Error(`ExerciseDB returned ${response.status}; existing snapshot was preserved`)
  const body = await response.json()
  if (!Array.isArray(body.data) || body.data.length === 0) throw new Error('ExerciseDB returned an empty page; existing snapshot was preserved')
  exercises.push(...body.data)
  if (!body.meta?.hasNextPage) break
  if (!body.meta.nextCursor || body.meta.nextCursor === cursor) throw new Error('ExerciseDB cursor did not advance')
  cursor = body.meta.nextCursor
  await mkdir('.perf-artifacts', { recursive: true })
  await writeFile('.perf-artifacts/exercise-download.json', JSON.stringify({ exercises, cursor }))
  if (exercises.length % 250 === 0) console.log(`Cached ${exercises.length} exercises`)
  await delay(2000)
}
const unique = [...new Map(exercises.map(exercise => [exercise.exerciseId, exercise])).values()]
if (unique.length < 1000) throw new Error('Incomplete exercise catalog; existing snapshot was preserved')
await mkdir('src/data', { recursive: true })
await writeFile('src/data/exercises.json', JSON.stringify({ source: 'https://oss.exercisedb.dev/api/v1/exercises', refreshedAt: new Date().toISOString(), exercises: unique }))
await unlink('.perf-artifacts/exercise-download.json').catch(() => {})
console.log(`Saved ${unique.length} exercises to the server-side catalog snapshot`)
