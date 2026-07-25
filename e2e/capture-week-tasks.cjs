const { chromium } = require('playwright');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  const text = fs.readFileSync(envPath, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    if (!line || line.startsWith('#')) continue;
    const i = line.indexOf('=');
    if (i === -1) continue;
    const k = line.slice(0, i).trim();
    let v = line.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!process.env[k]) process.env[k] = v;
  }
}

async function main() {
  loadEnv();
  const outDir = path.join(__dirname, '..', 'docs', 'task-week-screenshots');
  fs.mkdirSync(outDir, { recursive: true });

  await mongoose.connect(process.env.MONGODB_URI);
  const users = await mongoose.connection.db.collection('users').find({
    email: { $in: ['user1@test.com', 'ali@test.com'] }
  }).project({ email: 1, role: 1, fullName: 1 }).toArray();
  console.log('users', users.map(u => ({ email: u.email, role: u.role, id: String(u._id) })));

  const byEmail = Object.fromEntries(users.map(u => [u.email, u]));
  const secret = process.env.JWT_SECRET;
  function tokenFor(u) {
    return jwt.sign({ userId: String(u._id), role: u.role, email: u.email }, secret, { expiresIn: '7d' });
  }

  // Probe auth route
  const probe = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'user1@test.com', password: 'User@123' }),
  });
  console.log('login probe status', probe.status, (await probe.text()).slice(0, 120));

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

  async function shot(name, url, email) {
    const page = await context.newPage();
    if (email && byEmail[email]) {
      await context.addCookies([{
        name: 'token',
        value: tokenFor(byEmail[email]),
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        sameSite: 'Lax',
      }]);
    }
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(2500);
    // Hide floating chatbot if present for cleaner shot
    await page.evaluate(() => {
      document.querySelectorAll('[aria-label="AI Fitness Coach"]').forEach(el => el.style.display = 'none');
    }).catch(() => {});
    const file = path.join(outDir, name);
    await page.screenshot({ path: file, fullPage: true });
    console.log('saved', name, 'url=', page.url());
    await page.close();
    // clear cookies between roles
    await context.clearCookies();
  }

  // A/B Trainer meal plans + nutrition (closest existing)
  await shot('A-trainer-meal-plans.png', 'http://localhost:3000/meal-plans', 'ali@test.com');
  await shot('A-trainer-dashboard.png', 'http://localhost:3000/trainer-dashboard', 'ali@test.com');
  await shot('A-trainer-nutrition-library.png', 'http://localhost:3000/trainer-dashboard/nutrition', 'ali@test.com');

  // B create UI is inline generate form on meal-plans (not a modal) — capture after navigate
  await shot('B-trainer-meal-plans-generate-ui.png', 'http://localhost:3000/meal-plans', 'ali@test.com');

  // C user meal plans
  await shot('C-user-meal-plans.png', 'http://localhost:3000/meal-plans', 'user1@test.com');

  // D gamification
  await shot('D-user-my-fitness-gamification.png', 'http://localhost:3000/my-fitness', 'user1@test.com');
  await shot('D-user-dashboard-gamification.png', 'http://localhost:3000/dashboard', 'user1@test.com');

  // E community (no leaderboard expected)
  await shot('E-user-community.png', 'http://localhost:3000/community', 'user1@test.com');

  // Logged-out fallbacks if useful
  await shot('Z-login-page.png', 'http://localhost:3000/login', null);

  await browser.close();
  await mongoose.disconnect();
  console.log('DONE');
}

main().catch((e) => { console.error(e); process.exit(1); });
