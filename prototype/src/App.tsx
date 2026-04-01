import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ToastProvider } from './components/Toast'
import { Chatbot } from './components/Chatbot'
import { InlineHelper } from './components/InlineHelper'
import { Dashboard } from './pages/Dashboard'
import { Findings } from './pages/Findings'
import { HealthMap } from './pages/HealthMap'
import { MaturityModel } from './pages/MaturityModel'
import { ExecutiveReport } from './pages/ExecutiveReport'
import { FusionFindings } from './pages/FusionFindings'
import { BeforeAfter } from './pages/BeforeAfter'
import { prePathfinder } from './data/demo-pre-pathfinder'
import { postPathfinder } from './data/demo-post-pathfinder'

export default function App() {
  const [showPostPathfinder, setShowPostPathfinder] = useState(false)
  const [isDark, setIsDark] = useState(true)

  const data = showPostPathfinder ? postPathfinder : prePathfinder

  return (
    <div className={isDark ? 'dark' : 'light'}>
      <ToastProvider>
        <BrowserRouter>
          <AppContent
            isDark={isDark}
            onToggleTheme={() => setIsDark(!isDark)}
            showPostPathfinder={showPostPathfinder}
            onTogglePathfinder={() => setShowPostPathfinder(!showPostPathfinder)}
            data={data}
          />
        </BrowserRouter>
      </ToastProvider>
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function AppContent({ isDark, onToggleTheme, showPostPathfinder, onTogglePathfinder, data }: {
  isDark: boolean; onToggleTheme: () => void;
  showPostPathfinder: boolean; onTogglePathfinder: () => void;
  data: any;
}) {
  const location = useLocation()

  return (
    <>
      <Layout
        isDark={isDark}
        onToggleTheme={onToggleTheme}
        showPostPathfinder={showPostPathfinder}
        onTogglePathfinder={onTogglePathfinder}
      >
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard data={data} />} />
          <Route path="/findings" element={<Findings data={data} />} />
          <Route path="/health-map" element={<HealthMap data={data} />} />
          <Route path="/maturity" element={<MaturityModel data={data} />} />
          <Route path="/reports" element={<ExecutiveReport data={data} />} />
          <Route path="/fusion" element={<FusionFindings data={postPathfinder} disabled={!showPostPathfinder} />} />
          <Route path="/before-after" element={<BeforeAfter pre={prePathfinder} post={postPathfinder} />} />
        </Routes>
      </Layout>
      <InlineHelper currentPath={location.pathname} />
      <Chatbot />
    </>
  )
}
