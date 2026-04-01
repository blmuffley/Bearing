/**
 * Capture screenshots of all Bearing prototype pages.
 * Usage: npx playwright test --config=scripts/capture-screenshots.js
 * Or:    node scripts/capture-screenshots.js (with playwright installed globally)
 */

const { chromium } = require('playwright');
const path = require('path');

const BASE_URL = 'http://localhost:4201';
const OUTPUT_DIR = path.resolve(__dirname, '../docs/screenshots');

const PAGES = [
  { name: '01_dashboard_pre', path: '/dashboard', desc: 'Dashboard - Pre-Pathfinder (Score: 34)' },
  { name: '02_findings', path: '/findings', desc: 'Findings Explorer' },
  { name: '03_health_map', path: '/health-map', desc: 'CMDB Health Map' },
  { name: '04_maturity_model', path: '/maturity', desc: 'Maturity Model' },
  { name: '05_executive_reports', path: '/reports', desc: 'Executive Reports' },
  { name: '06_before_after', path: '/before-after', desc: 'Before / After Comparison' },
];

// Pages that need Pathfinder toggle ON
const PATHFINDER_PAGES = [
  { name: '07_dashboard_post', path: '/dashboard', desc: 'Dashboard - Post-Pathfinder (Score: 82)' },
  { name: '08_fusion_findings', path: '/fusion', desc: 'Pathfinder Fusion Findings' },
];

// Special captures
const SPECIAL = [
  { name: '09_chatbot_open', desc: 'AI Chatbot - Open with canned questions' },
  { name: '10_chatbot_response', desc: 'AI Chatbot - Response to health score question' },
  { name: '11_inline_helper', desc: 'Inline Page Helper' },
  { name: '12_finding_detail', desc: 'Finding Detail - Expanded row' },
];

async function captureScreenshots() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    colorScheme: 'dark',
  });
  const page = await context.newPage();

  console.log(`Capturing screenshots to ${OUTPUT_DIR}\n`);

  // 1. Pre-Pathfinder pages
  for (const pg of PAGES) {
    console.log(`  ${pg.name}: ${pg.desc}`);
    await page.goto(`${BASE_URL}${pg.path}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800); // let animations settle
    await page.screenshot({ path: path.join(OUTPUT_DIR, `${pg.name}.png`), fullPage: false });
  }

  // 2. Toggle Pathfinder ON
  console.log('\n  Toggling Pathfinder mode ON...');
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  // Click the Pre-Pathfinder/Post-Pathfinder toggle button
  const toggleBtn = page.locator('button:has-text("Pre-Pathfinder")');
  if (await toggleBtn.isVisible()) {
    await toggleBtn.click();
    await page.waitForTimeout(1000);
  }

  for (const pg of PATHFINDER_PAGES) {
    console.log(`  ${pg.name}: ${pg.desc}`);
    await page.goto(`${BASE_URL}${pg.path}`, { waitUntil: 'networkidle' });
    // Re-toggle if needed (navigation may reset state)
    const preBtn = page.locator('button:has-text("Pre-Pathfinder")');
    if (await preBtn.isVisible()) {
      await preBtn.click();
      await page.waitForTimeout(800);
    }
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(OUTPUT_DIR, `${pg.name}.png`), fullPage: false });
  }

  // 3. Chatbot open
  console.log(`\n  ${SPECIAL[0].name}: ${SPECIAL[0].desc}`);
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  // Click the chat button (bottom-left circle)
  const chatBtn = page.locator('button.fixed.bottom-6.left-6');
  if (await chatBtn.isVisible()) {
    await chatBtn.click();
    await page.waitForTimeout(600);
  }
  await page.screenshot({ path: path.join(OUTPUT_DIR, `${SPECIAL[0].name}.png`), fullPage: false });

  // 4. Chatbot with response - click first canned question
  console.log(`  ${SPECIAL[1].name}: ${SPECIAL[1].desc}`);
  const firstQuestion = page.locator('button:has-text("What is our current")');
  if (await firstQuestion.isVisible()) {
    await firstQuestion.click();
    await page.waitForTimeout(2500); // wait for typing simulation
  }
  await page.screenshot({ path: path.join(OUTPUT_DIR, `${SPECIAL[1].name}.png`), fullPage: false });

  // 5. Close chatbot, show inline helper
  console.log(`  ${SPECIAL[2].name}: ${SPECIAL[2].desc}`);
  // Close chatbot first
  const closeChat = page.locator('button.fixed.bottom-6.left-6');
  if (await closeChat.isVisible()) {
    await closeChat.click();
    await page.waitForTimeout(300);
  }
  // Click the ? helper button
  const helperBtn = page.locator('button:has-text("?")');
  if (await helperBtn.isVisible()) {
    await helperBtn.click();
    await page.waitForTimeout(400);
    // Expand a tip
    const firstTip = page.locator('button:has-text("Health Score")');
    if (await firstTip.isVisible()) {
      await firstTip.click();
      await page.waitForTimeout(300);
    }
  }
  await page.screenshot({ path: path.join(OUTPUT_DIR, `${SPECIAL[2].name}.png`), fullPage: false });

  // 6. Finding detail - go to findings and expand a row
  console.log(`  ${SPECIAL[3].name}: ${SPECIAL[3].desc}`);
  await page.goto(`${BASE_URL}/findings`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  // Click the first finding row to expand it
  const firstRow = page.locator('table tbody tr').first();
  if (await firstRow.isVisible()) {
    await firstRow.click();
    await page.waitForTimeout(500);
  }
  await page.screenshot({ path: path.join(OUTPUT_DIR, `${SPECIAL[3].name}.png`), fullPage: false });

  await browser.close();
  console.log(`\nDone! ${PAGES.length + PATHFINDER_PAGES.length + SPECIAL.length} screenshots captured.`);
}

captureScreenshots().catch(err => {
  console.error('Screenshot capture failed:', err);
  process.exit(1);
});
