const fs = require('fs')
const t = fs.readFileSync(
  'C:/Users/Tayyab/.cursor/projects/c-Users-Tayyab-Desktop-FYP-FINAL/agent-transcripts/91a75c44-2eaa-4d7e-8e46-a68df37a33ff/91a75c44-2eaa-4d7e-8e46-a68df37a33ff.jsonl',
  'utf8'
)

const loginMarker = "'use client'\nimport { useState } from 'react'\nimport Link from 'next/link'\nimport { useRouter, useSearchParams }"
const loginStart = t.indexOf(loginMarker)
const loginEnd = t.indexOf('--- src/app/(auth)/signup/page.tsx ---', loginStart)
const signupStart = t.lastIndexOf("'use client'", loginEnd)
const signupEnd = t.indexOf('--- src/app/(auth)/register-trainer/page.tsx ---', signupStart)

fs.writeFileSync('C:/Users/Tayyab/Desktop/FYP-FINAL/_login.tsx', t.substring(loginStart, loginEnd).trim())
fs.writeFileSync('C:/Users/Tayyab/Desktop/FYP-FINAL/_signup.tsx', t.substring(signupStart, signupEnd).trim())
console.log('login', loginStart, loginEnd, loginEnd - loginStart)
console.log('signup', signupStart, signupEnd, signupEnd - signupStart)
