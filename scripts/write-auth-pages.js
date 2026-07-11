const fs = require('fs')
const path = require('path')

const t = fs.readFileSync(
  path.join(__dirname, '..', '..', '.cursor', 'projects', 'c-Users-Tayyab-Desktop-FYP-FINAL', 'agent-transcripts', '91a75c44-2eaa-4d7e-8e46-a68df37a33ff', '91a75c44-2eaa-4d7e-8e46-a68df37a33ff.jsonl'),
  'utf8'
).replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\t/g, '\t')

function extractBetween(startMarker, endMarker) {
  const start = t.indexOf(startMarker)
  const end = t.indexOf(endMarker, start)
  if (start < 0 || end < 0) throw new Error(`Markers not found: ${startMarker}`)
  return t.substring(start, end).trim()
}

const login = extractBetween(
  "'use client'\nimport { useState } from 'react'\nimport Link from 'next/link'\nimport { useRouter, useSearchParams }",
  "--- src/app/(auth)/signup/page.tsx ---"
)

const signup = extractBetween(
  "const COUNTRIES = ['Pakistan', 'UAE', 'Saudi Arabia', 'UK', 'USA', 'Canada', 'Australia', 'Germany', 'France', 'India']",
  "--- src/app/(auth)/register-trainer/page.tsx ---"
)

const signupFull = `'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'

${signup}`

const base = path.join(__dirname, '..', 'src', 'app', '(auth)')
fs.mkdirSync(path.join(base, 'login'), { recursive: true })
fs.mkdirSync(path.join(base, 'signup'), { recursive: true })
fs.writeFileSync(path.join(base, 'login', 'page.tsx'), login)
fs.writeFileSync(path.join(base, 'signup', 'page.tsx'), signupFull)
console.log('Wrote login', login.length, 'signup', signupFull.length)
