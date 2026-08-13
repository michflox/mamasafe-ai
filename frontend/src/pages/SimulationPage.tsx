import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { FlaskConical, Play, AlertTriangle, CheckCircle, BookOpen, Loader2 } from 'lucide-react'
import { apiFetch } from '../utils/api'

export default function SimulationPage() {
  const [cases, setCases] = useState<any[]>([])
  const [runningCase, setRunningCase] = useState<string | null>(null)
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    apiFetch('/api/v1/simulation/cases').then(r => r.json()).then(setCases)
  }, [])

  const runCase = async (caseId: string) => {
    setLoading(true)
    setRunningCase(caseId)
    setResult(null)
    try {
      const res = await apiFetch(`/api/v1/simulation/run/${caseId}`, { method: 'POST' })
      setResult(await res.json())
    } catch (e) { alert('Simulation failed') } finally { setLoading(false) }
  }

  const riskColors: Record<string, string> = {
    critical: 'bg-red-100 text-red-800 border-red-300', high: 'bg-orange-100 text-orange-800 border-orange-300',
    moderate: 'bg-yellow-100 text-yellow-800 border-yellow-300', low: 'bg-green-100 text-green-800 border-green-300',
  }

  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-amber-700 shrink-0" />
          <div>
            <h2 className="font-bold text-amber-900">SIMULATION / EDUCATIONAL USE ONLY</h2>
            <p className="text-sm text-amber-800 mt-1">All cases below are synthetic and fictional. No real patient data is used.</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {cases.map((c) => (
          <div key={c.case_id} className="bg-white rounded-lg shadow p-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-gray-900">{c.title}</h3>
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{c.description}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${riskColors[c.expected_risk] || 'bg-gray-100'}`}>Expected: {c.expected_risk?.toUpperCase()}</span>
                </div>
              </div>
              <button onClick={() => runCase(c.case_id)} disabled={loading} className="shrink-0 bg-rose-700 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-rose-800 disabled:opacity-50 flex items-center gap-1">
                {loading && runningCase === c.case_id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />} Run
              </button>
            </div>
            {result && runningCase === c.case_id && (
              <div className="mt-4 border-t pt-4">
                <div className={`rounded-lg p-3 mb-3 ${riskColors[result.assessment.risk_level]}`}>
                  <p className="font-bold">Result: {result.assessment.risk_level.toUpperCase()} RISK</p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm flex items-center gap-1"><BookOpen className="w-4 h-4" /> Teaching Points</h4>
                  <ul className="space-y-1">
                    {result.teaching_points.map((tp: string, i: number) => (
                      <li key={i} className="text-xs text-gray-700 flex items-start gap-1.5"><CheckCircle className="w-3 h-3 text-emerald-500 mt-0.5 shrink-0" />{tp}</li>
                    ))}
                  </ul>
                </div>
                <div className="mt-3"><Link to="/results" state={result.assessment} className="text-rose-700 text-sm font-medium underline">View Full Assessment →</Link></div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
