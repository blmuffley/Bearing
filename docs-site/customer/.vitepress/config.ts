import { defineConfig } from 'vitepress'
import { resolve } from 'path'
import { copyFileSync, readdirSync, existsSync, mkdirSync } from 'fs'

// Copy selected SVG diagrams from docs/diagrams to public/ at config load time
const diagramsDir = resolve(__dirname, '../../../docs/diagrams')
const publicDir = resolve(__dirname, '../public')
if (!existsSync(publicDir)) mkdirSync(publicDir, { recursive: true })
const customerDiagrams = [
  '01_system_architecture.svg',
  '03_eight_dimensions.svg',
  '04_maturity_model.svg',
  '05_product_suite.svg',
]
if (existsSync(diagramsDir)) {
  for (const file of customerDiagrams) {
    const src = resolve(diagramsDir, file)
    if (existsSync(src)) {
      copyFileSync(src, resolve(publicDir, file))
    }
  }
}

export default defineConfig({
  title: 'Bearing Documentation',
  description: 'CMDB Health Assessment Platform by Avennorth',

  head: [
    ['meta', { name: 'theme-color', content: '#1A1A2E' }],
  ],

  themeConfig: {
    siteTitle: 'Bearing Docs',

    nav: [
      { text: 'Home', link: '/' },
      { text: 'Getting Started', link: '/getting-started' },
      { text: 'Assessment Guide', link: '/assessment-guide' },
      { text: 'avennorth.com', link: 'https://avennorth.com' },
    ],

    sidebar: [
      {
        text: 'Overview',
        items: [
          { text: 'Solution Overview', link: '/solution-overview' },
          { text: 'Getting Started', link: '/getting-started' },
        ],
      },
      {
        text: 'Assessments',
        items: [
          { text: 'Assessment Guide', link: '/assessment-guide' },
          { text: 'Dimensions Explained', link: '/dimensions-explained' },
          { text: 'Maturity Model', link: '/maturity-model' },
        ],
      },
      {
        text: 'Reports',
        items: [
          { text: 'Report Samples', link: '/report-samples' },
        ],
      },
      {
        text: 'Support',
        items: [
          { text: 'FAQ', link: '/faq' },
        ],
      },
    ],

    footer: {
      message: 'Avennorth Bearing — CMDB Health Assessment Platform',
      copyright: 'Copyright 2026 Avennorth. All rights reserved.',
    },

    search: {
      provider: 'local',
    },
  },

})
