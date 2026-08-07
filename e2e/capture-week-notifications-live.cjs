/**
 * Capture week-task screenshots: notification bell + live sessions page.
 * Usage: ensure dev server on :3000, then node e2e/capture-week-notifications-live.cjs
 */
const { chromium } = require('playwright')
const jwt = require('jsonwebtoken')
const mongoose = require('mongoose')
const fs = require('fs')
const path = require('path')
const { randomUUID } = require('crypto')

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local')
  if (!fs.existsSync(envPath)) return
  const text = fs.readFileSync(envPath, 'utf8')
  for (const line of text.split(/\r?\n/)) {
    if (!line || line.startsWith('#')) continue
    const i = line.indexOf('=')
    if (i === -1) continue
    const k = line.slice(0, i).trim()
    let v = line.slice(i + 1).trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1)
    }
    if (!process.env[k]) process.env[k] = v
  }
}

async function seedNotifications(userId) {
  const col = mongoose.connection.db.collection('notifications')
  await col.deleteMany({ userId: new mongoose.Types.ObjectId(userId), title: /^Week demo/ })
  const now = Date.now()
  const docs = [
    {
      userId: new mongoose.Types.ObjectId(userId),
      title: 'Week demo — Request accepted',
      message: 'Ali Trainer accepted your connection request.',
      type: 'trainer',
      isRead: false,
      link: '/notifications',
      createdAt: new Date(now - 5 * 60_000),
      updatedAt: new Date(now - 5 * 60_000),
    },
    {
      userId: new mongoose.Types.ObjectId(userId),
      title: 'Week demo — New message',
      message: 'Hey! Ready for your session tomorrow?',
      type: 'chat',
      isRead: false,
      link: '/notifications',
      createdAt: new Date(now - 45 * 60_000),
      updatedAt: new Date(now - 45 * 60_000),
    },
    {
      userId: new mongoose.Types.ObjectId(userId),
      title: 'Week demo — Workout plan assigned',
      message: 'Ali assigned you “Strength Builder”.',
      type: 'workout',
      isRead: true,
      link: '/my-fitness',
      createdAt: new Date(now - 2 * 24 * 60 * 60_000),
      updatedAt: new Date(now - 2 * 24 * 60 * 60_000),
    },
  ]
  await col.insertMany(docs)
}

async function seedLiveSession(trainerUserId, clientUserId) {
  const col = mongoose.connection.db.collection('livesessions')
  const roomId = randomUUID()
  const scheduledAt = new Date(Date.now() + 2 * 24 * 60 * 60_000)
  const roomName = `live-${roomId}`.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 80)
  const meetingUrl = `https://daily.co/${encodeURIComponent(roomName)}`
  await col.deleteMany({ title: 'Week demo live HIIT' })
  await col.insertOne({
    trainerId: new mongoose.Types.ObjectId(trainerUserId),
    clientId: new mongoose.Types.ObjectId(clientUserId),
    title: 'Week demo live HIIT',
    scheduledAt,
    durationMinutes: 60,
    maxParticipants: 2,
    participantIds: [new mongoose.Types.ObjectId(clientUserId)],
    status: 'scheduled',
    roomId,
    meetingProvider: 'daily',
    meetingRoomName: roomName,
    meetingUrl,
    dailyRoomName: roomName,
    dailyRoomUrl: meetingUrl,
    createdAt: new Date(),
    updatedAt: new Date(),
  })
}

async function main() {
  loadEnv()
  const outDir = path.join(__dirname, '..', 'docs', 'task-week-screenshots')
  fs.mkdirSync(outDir, { recursive: true })

  await mongoose.connect(process.env.MONGODB_URI)
  const users = await mongoose.connection.db
    .collection('users')
    .find({ email: { $in: ['user1@test.com', 'ali@test.com'] } })
    .project({ email: 1, role: 1 })
    .toArray()

  const byEmail = Object.fromEntries(users.map((u) => [u.email, u]))
  const user1 = byEmail['user1@test.com']
  const ali = byEmail['ali@test.com']
  if (!user1 || !ali) {
    throw new Error('Seed users user1@test.com and ali@test.com not found')
  }

  await seedNotifications(String(user1._id))
  await seedLiveSession(String(ali._id), String(user1._id))

  const secret = process.env.JWT_SECRET
  function tokenFor(u) {
    return jwt.sign(
      { userId: String(u._id), role: u.role, email: u.email },
      secret,
      { expiresIn: '7d' },
    )
  }

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })

  async function loginAs(email) {
    const page = await context.newPage()
    await context.addCookies([
      {
        name: 'token',
        value: tokenFor(byEmail[email]),
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        sameSite: 'Lax',
      },
    ])
    return page
  }

  // Notification bell dropdown (user1)
  const bellPage = await loginAs('user1@test.com')
  await bellPage.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle', timeout: 60000 })
  await bellPage.waitForTimeout(2000)
  const bellBtn = bellPage.getByRole('button', { name: 'Notifications' })
  await bellBtn.click()
  await bellPage.waitForTimeout(1500)
  await bellPage.evaluate(() => {
    document.querySelectorAll('[aria-label="AI Fitness Coach"]').forEach((el) => {
      el.style.display = 'none'
    })
  })
  await bellPage.screenshot({
    path: path.join(outDir, 'week-notifications-bell-dropdown.png'),
    fullPage: false,
  })
  await bellPage.close()

  // Live sessions — trainer view with schedule button + list
  const livePage = await loginAs('ali@test.com')
  await livePage.goto('http://localhost:3000/live-sessions', { waitUntil: 'networkidle', timeout: 60000 })
  await livePage.waitForTimeout(2500)
  await livePage.evaluate(() => {
    document.querySelectorAll('[aria-label="AI Fitness Coach"]').forEach((el) => {
      el.style.display = 'none'
    })
  })
  await livePage.screenshot({
    path: path.join(outDir, 'week-live-sessions-page.png'),
    fullPage: true,
  })

  // Optional: open schedule modal for richer screenshot
  const scheduleBtn = livePage.getByRole('button', { name: /Schedule session/i }).first()
  if (await scheduleBtn.isVisible().catch(() => false)) {
    await scheduleBtn.click()
    await livePage.waitForTimeout(800)
    await livePage.screenshot({
      path: path.join(outDir, 'week-live-sessions-schedule-modal.png'),
      fullPage: false,
    })
  }

  await livePage.close()
  await context.clearCookies()
  await browser.close()
  await mongoose.disconnect()
  console.log('Screenshots saved to', outDir)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
