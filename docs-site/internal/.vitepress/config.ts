import { defineConfig } from 'vitepress'
import { resolve } from 'path'
import { copyFileSync, readdirSync, existsSync, mkdirSync } from 'fs'

// Copy SVG diagrams from docs/diagrams to public/ at config load time
const diagramsDir = resolve(__dirname, '../../../docs/diagrams')
const publicDir = resolve(__dirname, '../public')
if (!existsSync(publicDir)) mkdirSync(publicDir, { recursive: true })
if (existsSync(diagramsDir)) {
  for (const file of readdirSync(diagramsDir)) {
    if (file.endsWith('.svg')) {
      copyFileSync(resolve(diagramsDir, file), resolve(publicDir, file))
    }
  }
}

// Copy screenshots from docs/screenshots to public/screenshots/ at config load time
const screenshotsDir = resolve(__dirname, '../../../docs/screenshots')
const publicScreenshotsDir = resolve(publicDir, 'screenshots')
if (!existsSync(publicScreenshotsDir)) mkdirSync(publicScreenshotsDir, { recursive: true })
if (existsSync(screenshotsDir)) {
  for (const file of readdirSync(screenshotsDir)) {
    if (file.endsWith('.png')) {
      copyFileSync(resolve(screenshotsDir, file), resolve(publicScreenshotsDir, file))
    }
  }
}

export default defineConfig({
  title: 'Bearing Engineering Docs',
  description: 'Internal engineering documentation for Avennorth Bearing',

  head: [
    ['meta', { name: 'theme-color', content: '#1A1A2E' }],
    ['meta', { name: 'robots', content: 'noindex, nofollow' }],
  ],

  themeConfig: {
    siteTitle: 'Bearing Internal',

    nav: [
      { text: 'Home', link: '/' },
      { text: 'Architecture', link: '/architecture-deep-dive' },
      { text: 'API Reference', link: '/api-reference' },
      {
        text: 'INTERNAL',
        items: [
          { text: 'This site is for Avennorth engineers only', link: '/' },
        ],
      },
    ],

    sidebar: [
      {
        text: 'Architecture',
        items: [
          { text: 'Architecture Deep Dive', link: '/architecture-deep-dive' },
          { text: 'Technical Architecture', link: '/technical-architecture' },
          { text: 'Assessment Engine', link: '/assessment-engine' },
          { text: 'Product Spec', link: '/product-spec' },
        ],
      },
      {
        text: 'Engine References',
        items: [
          { text: 'Dimension Scorer', link: '/dimension-scorer-reference' },
          { text: 'Fusion Engine', link: '/fusion-engine-reference' },
          { text: 'Report Generator', link: '/report-generator-reference' },
        ],
      },
      {
        text: 'API and Deployment',
        items: [
          { text: 'API Reference', link: '/api-reference' },
          { text: 'Deployment Guide', link: '/deployment-guide' },
          { text: 'Production Release Guide', link: '/production-release-guide' },
          { text: 'Testing Guide', link: '/testing-guide' },
        ],
      },
      {
        text: 'Consulting',
        items: [
          { text: 'Consulting Playbook', link: '/consulting-playbook' },
        ],
      },
      {
        text: 'Operations',
        items: [
          { text: 'Known Issues', link: '/known-issues' },
          { text: 'Workarounds', link: '/workarounds' },
          { text: 'Support Guide', link: '/support-guide' },
          { text: 'Changelog', link: '/changelog' },
        ],
      },
      {
        text: 'Screenshots',
        items: [
          { text: 'Dashboard', link: '/screenshots/dashboard' },
          { text: 'Findings', link: '/screenshots/findings' },
          { text: 'Health Map', link: '/screenshots/health-map' },
          { text: 'Maturity', link: '/screenshots/maturity' },
          { text: 'Reports', link: '/screenshots/reports' },
          { text: 'Fusion', link: '/screenshots/fusion' },
          { text: 'Before / After', link: '/screenshots/before-after' },
        ],
      },
    ],

    footer: {
      message: 'Avennorth Internal -- Not for customer distribution',
      copyright: 'Copyright 2026 Avennorth. All rights reserved.',
    },

    search: {
      provider: 'local',
    },
  },
})
