import { useState, useRef, useEffect } from 'react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

const CANNED_QUESTIONS = [
  {
    question: "What is our current CMDB health score and what does it mean?",
    answer: `Your current CMDB health score is **34 out of 100** (Grade: F), placing Mercy Health System at **Maturity Level 1 - Ad-hoc**.

This means your CMDB has significant gaps across all eight assessment dimensions. The most critical issues are:

- **82% of CIs have no discovery validation** — data accuracy is unverified
- **69% of CIs have no service dependencies mapped** — incident impact analysis is blind
- **No CSDM Business Service layer** — you cannot produce accurate service maps
- **1,200 CIs haven't been updated in 180+ days** — decisions are based on stale data

Your estimated technical debt is **$2.4M** in manual remediation effort. The good news: most of this can be automated with the right tools.`
  },
  {
    question: "Where should we focus remediation efforts first?",
    answer: `Based on composite scoring (severity × 40% + effort-inverse × 30% + risk × 30%), your **top 3 quick wins** are:

1. **Deploy automated discovery** (Accuracy: 18/100) — This single action addresses your largest gap. Without discovery validation, every other dimension suffers. Pathfinder can validate 6,400+ CIs automatically within 30 days.

2. **Map service dependencies** (Relationships: 31/100) — 12,420 CIs have zero relationships. Start with your top 50 business-critical applications and map their infrastructure dependencies. This directly reduces incident MTTR.

3. **Address stale records** (Currency: 28/100) — 1,200 CIs are 180+ days stale. Run a validation sweep: retire decommissioned assets, update active ones. This improves every downstream metric.

These three actions alone could move your score from 34 to approximately **55-65** and advance you to **Maturity Level 2 (Managed)**.`
  },
  {
    question: "How much is our CMDB technical debt costing us?",
    answer: `Your total estimated technical debt is **$2,400,000**, broken down by dimension:

| Dimension | Debt | Primary Driver |
|-----------|------|---------------|
| Relationships | $670K | 12,420 unmapped CIs × extended MTTR |
| Accuracy | $486K | 14,760 unvalidated CIs × incident cost |
| Completeness | $378K | Missing fields across 10,440 CIs |
| CSDM | $324K | No service-to-infrastructure mapping |
| Orphans | $300K | 4,100 CIs invisible to impact analysis |
| Currency | $180K | 4,000 stale CIs requiring validation |
| Duplicates | $51K | 340 duplicate CIs causing confusion |
| Classification | $11K | 810 misclassified CIs |

**The real cost is hidden in operations:** Every P1 incident takes 3x longer to resolve when dependency maps don't exist. Every change is a blind risk when 69% of integrations are undocumented. These numbers are conservative — they don't include compliance exposure, audit risk, or failed change costs.`
  },
  {
    question: "What would Pathfinder do for our CMDB?",
    answer: `Based on comparable deployments, Pathfinder would transform your CMDB within **30 days**:

**Before Pathfinder** (current state):
- Score: 34/100 (Grade F) → **After: 82/100 (Grade B)**
- Maturity: Level 1 (Ad-hoc) → **Level 3 (Defined)**
- Technical Debt: $2.4M → **$620K (reduced by $1.8M)**

**What Pathfinder discovers automatically:**
- **6,400 CIs** validated through behavioral observation
- **382 integrations** discovered (vs. 120 you knew about)
- **34 shadow IT systems** — active infrastructure with no CMDB record
- **89 ghost CIs** — records for assets that no longer exist
- **23 misclassified CIs** corrected via behavioral analysis
- **3,420 orphaned CIs** connected through observed relationships

**Fusion findings** — insights only possible by combining CMDB records with live network observation — are the differentiator. No other tool produces these.

**ROI: $50K/year investment → $1.8M debt reduction = 36x return in 30 days.**`
  },
  {
    question: "How do we compare to similar organizations?",
    answer: `Based on aggregated assessment data from healthcare organizations of similar size (10,000-25,000 CIs):

| Metric | Mercy Health | Peer Median | Top Quartile |
|--------|-------------|-------------|-------------|
| Overall Score | 34 | 52 | 74 |
| Maturity Level | 1 (Ad-hoc) | 2 (Managed) | 3 (Defined) |
| Discovery Coverage | 18% | 55% | 82% |
| Relationship Coverage | 31% | 48% | 71% |
| CSDM Adoption | 1 layer | 2 layers | 3 layers |
| Technical Debt | $2.4M | $1.1M | $420K |

**Key gaps vs. peers:**
- You are **18 points below the peer median** overall
- Your accuracy score (18) is the largest single gap — most peers have at least basic discovery running
- Zero CSDM adoption puts you behind 78% of comparable organizations

**The path to peer median** requires deploying automated discovery and beginning CSDM framework adoption — exactly what Pathfinder and Contour deliver.`
  },
  {
    question: "What does the remediation roadmap look like?",
    answer: `Here's a phased remediation roadmap based on your assessment:

**Phase 1: Foundation (Weeks 1-4)** — Target: Level 2 (Managed)
- Deploy Pathfinder for automated CI discovery and validation
- Run initial discovery sweep across all monitored subnets
- Validate and retire 1,200+ stale CIs (180+ days)
- Expected score improvement: 34 → 55-65

**Phase 2: Structure (Weeks 5-8)** — Target: Level 3 (Defined)
- Begin CSDM framework adoption (Business Service + Infrastructure layers)
- Map top 50 critical application dependencies
- Enable Pathfinder fusion findings for continuous validation
- Resolve 290+ duplicate CIs with CMDB Ops agents
- Expected score improvement: 65 → 75-82

**Phase 3: Governance (Weeks 9-16)** — Target: Level 4 (Measured)
- Deploy Contour for service model automation (Technical Service + Business App layers)
- Implement automated governance: duplicate detection, stale CI alerts
- Enable continuous Bearing assessments on weekly schedule
- Establish degradation alert thresholds
- Expected score improvement: 82 → 85-90

**Phase 4: Optimization (Ongoing)** — Target: Level 5 (Optimized)
- Full CSDM adoption across all 4 layers
- Autonomous CMDB operations via AI-driven remediation
- Continuous assessment with trend tracking
- Target: 90+ sustained score

**Investment:** Pathfinder ($50K/yr) + Contour (bundled) + Bearing Continuous ($36K/yr)
**Expected debt reduction:** $2.4M → $200K over 16 weeks`
  },
]

export function Chatbot() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'assistant',
      content: 'Hello! I\'m the Bearing AI assistant. I can help you understand your CMDB health assessment results, explain findings, and recommend next steps.\n\nSelect a question below or type your own.',
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [showQuestions, setShowQuestions] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const addMessage = (role: 'user' | 'assistant', content: string) => {
    setMessages(prev => [
      ...prev,
      { id: String(Date.now() + Math.random()), role, content, timestamp: new Date() },
    ])
  }

  const simulateResponse = (answer: string) => {
    setIsTyping(true)
    setShowQuestions(false)
    // Simulate typing delay proportional to answer length
    const delay = Math.min(1500, 500 + answer.length / 10)
    setTimeout(() => {
      addMessage('assistant', answer)
      setIsTyping(false)
      setShowQuestions(true)
    }, delay)
  }

  const handleCannedQuestion = (idx: number) => {
    const q = CANNED_QUESTIONS[idx]
    addMessage('user', q.question)
    simulateResponse(q.answer)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return
    const userInput = input.trim()
    addMessage('user', userInput)
    setInput('')

    // Match against canned questions by keyword
    const lower = userInput.toLowerCase()
    let matched = false
    if (lower.includes('score') || lower.includes('health') || lower.includes('grade')) {
      simulateResponse(CANNED_QUESTIONS[0].answer)
      matched = true
    } else if (lower.includes('focus') || lower.includes('first') || lower.includes('quick win') || lower.includes('priorit')) {
      simulateResponse(CANNED_QUESTIONS[1].answer)
      matched = true
    } else if (lower.includes('cost') || lower.includes('debt') || lower.includes('dollar') || lower.includes('money')) {
      simulateResponse(CANNED_QUESTIONS[2].answer)
      matched = true
    } else if (lower.includes('pathfinder') || lower.includes('discover') || lower.includes('fix')) {
      simulateResponse(CANNED_QUESTIONS[3].answer)
      matched = true
    } else if (lower.includes('compare') || lower.includes('benchmark') || lower.includes('peer') || lower.includes('industry')) {
      simulateResponse(CANNED_QUESTIONS[4].answer)
      matched = true
    } else if (lower.includes('roadmap') || lower.includes('plan') || lower.includes('timeline') || lower.includes('phase')) {
      simulateResponse(CANNED_QUESTIONS[5].answer)
      matched = true
    }

    if (!matched) {
      simulateResponse(
        "That's a great question. Based on your assessment data, I'd recommend reviewing the **Findings Explorer** for detailed analysis, or checking the **Maturity Model** page for your improvement roadmap.\n\nYou can also ask me about:\n- Your current health score\n- Where to focus remediation\n- Technical debt costs\n- What Pathfinder would do\n- Peer benchmarking\n- The remediation roadmap"
      )
    }
  }

  const renderMarkdown = (text: string) => {
    // Simple markdown: bold, tables, bullet lists
    let html = text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n- /g, '<br/>• ')
      .replace(/\n(\d+)\. /g, '<br/>$1. ')

    // Simple table rendering
    if (html.includes('|')) {
      const lines = html.split('<br/>')
      let inTable = false
      let tableHtml = ''
      const nonTableParts: string[] = []

      for (const line of lines) {
        const trimmed = line.replace(/<\/?p>/g, '').trim()
        if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
          if (!inTable) {
            inTable = true
            tableHtml = '<table style="width:100%;font-size:12px;border-collapse:collapse;margin:8px 0">'
          }
          if (trimmed.includes('---')) continue
          const cells = trimmed.split('|').filter(c => c.trim())
          const tag = tableHtml.includes('<tr>') ? 'td' : 'th'
          tableHtml += '<tr>' + cells.map(c =>
            `<${tag} style="padding:4px 8px;border-bottom:1px solid var(--color-border);text-align:left">${c.trim()}</${tag}>`
          ).join('') + '</tr>'
        } else {
          if (inTable) {
            tableHtml += '</table>'
            nonTableParts.push(tableHtml)
            tableHtml = ''
            inTable = false
          }
          nonTableParts.push(line)
        }
      }
      if (inTable) {
        tableHtml += '</table>'
        nonTableParts.push(tableHtml)
      }
      html = nonTableParts.join('<br/>')
    }

    return html
  }

  return (
    <>
      {/* Chat button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 left-6 w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all z-50"
        style={{
          backgroundColor: isOpen ? 'var(--color-bg-tertiary)' : 'var(--color-accent)',
          color: isOpen ? 'var(--color-text-primary)' : '#000',
          border: `2px solid ${isOpen ? 'var(--color-border)' : 'var(--color-accent)'}`,
        }}
      >
        {isOpen ? (
          <span className="text-xl">&#10005;</span>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        )}
      </button>

      {/* Chat panel */}
      {isOpen && (
        <div
          className="fixed bottom-24 left-6 w-96 rounded-xl shadow-2xl flex flex-col z-50"
          style={{
            backgroundColor: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border)',
            height: '520px',
            animation: 'fadeInUp 0.2s ease-out',
          }}
        >
          {/* Header */}
          <div className="px-4 py-3 flex items-center gap-3" style={{ borderBottom: '1px solid var(--color-border)' }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundColor: 'var(--color-accent)', color: '#000' }}>
              AI
            </div>
            <div>
              <div className="font-heading font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>Bearing Assistant</div>
              <div className="text-xs" style={{ color: 'var(--color-accent)' }}>Online</div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3" style={{ scrollbarWidth: 'thin' }}>
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className="max-w-[85%] rounded-lg px-3 py-2 text-sm"
                  style={{
                    backgroundColor: msg.role === 'user' ? 'var(--color-accent)' : 'var(--color-bg-tertiary)',
                    color: msg.role === 'user' ? '#000' : 'var(--color-text-primary)',
                  }}
                >
                  <div dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start">
                <div className="rounded-lg px-3 py-2 text-sm" style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-tertiary)' }}>
                  <span className="inline-flex gap-1">
                    <span className="animate-bounce" style={{ animationDelay: '0ms' }}>.</span>
                    <span className="animate-bounce" style={{ animationDelay: '150ms' }}>.</span>
                    <span className="animate-bounce" style={{ animationDelay: '300ms' }}>.</span>
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Canned questions */}
          {showQuestions && !isTyping && (
            <div className="px-4 py-2 space-y-1" style={{ borderTop: '1px solid var(--color-border)' }}>
              <div className="text-xs mb-1" style={{ color: 'var(--color-text-tertiary)' }}>Suggested questions:</div>
              <div className="flex flex-wrap gap-1">
                {CANNED_QUESTIONS.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => handleCannedQuestion(i)}
                    className="text-xs px-2 py-1 rounded-full truncate max-w-full transition-colors"
                    style={{
                      backgroundColor: 'var(--color-bg-primary)',
                      color: 'var(--color-accent)',
                      border: '1px solid var(--color-border)',
                    }}
                    title={q.question}
                  >
                    {q.question.length > 40 ? q.question.slice(0, 40) + '...' : q.question}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <form onSubmit={handleSubmit} className="px-4 py-3 flex gap-2" style={{ borderTop: '1px solid var(--color-border)' }}>
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask about your assessment..."
              className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
              style={{
                backgroundColor: 'var(--color-bg-primary)',
                color: 'var(--color-text-primary)',
                border: '1px solid var(--color-border)',
              }}
            />
            <button
              type="submit"
              className="px-3 py-2 rounded-lg text-sm font-semibold"
              style={{ backgroundColor: 'var(--color-accent)', color: '#000' }}
            >
              Send
            </button>
          </form>
        </div>
      )}
    </>
  )
}
