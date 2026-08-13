import { Link } from 'react-router-dom'
import { HeartPulse, Shield, WifiOff, Stethoscope, FlaskConical, Baby, Syringe, MapPin, Clock } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="space-y-6">
      <div className="text-center py-6">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-rose-100 rounded-full mb-4">
          <HeartPulse className="w-8 h-8 text-rose-700" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">MamaSafe AI</h1>
        <p className="text-gray-600 mt-1 max-w-md mx-auto">AI that strengthens the frontline of maternal care across Africa</p>
        <div className="flex justify-center gap-4 mt-3 text-xs text-gray-500">
          <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> Safety First</span>
          <span className="flex items-center gap-1"><WifiOff className="w-3 h-3" /> Works Offline</span>
        </div>
      </div>

      <div className="bg-rose-700 text-white rounded-xl p-5 shadow-lg">
        <div className="flex items-start justify-between">
          <div>
            <span className="inline-block bg-rose-500 text-xs px-2 py-0.5 rounded mb-2">ACTIVE MODULE</span>
            <h2 className="text-xl font-bold">Maternal Emergencies</h2>
            <p className="text-rose-100 text-sm mt-1">Postpartum hemorrhage copilot with WHO-guided workflows</p>
          </div>
          <Stethoscope className="w-10 h-10 text-rose-300" />
        </div>
        <div className="mt-4 flex gap-3">
          <Link to="/assess" className="flex-1 bg-white text-rose-700 text-center py-2.5 rounded-lg font-semibold text-sm hover:bg-rose-50 transition">Start PPH Assessment</Link>
          <Link to="/simulation" className="flex-1 bg-rose-800 text-white text-center py-2.5 rounded-lg font-semibold text-sm hover:bg-rose-900 transition">Run Simulation</Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center"><span className="text-blue-700 font-bold text-xs">AI</span></div>
            <h3 className="font-semibold text-sm">Gemini</h3>
          </div>
          <p className="text-xs text-gray-600">Natural language intake, voice-to-data, education, handoff generation</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-emerald-500">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center"><Shield className="w-4 h-4 text-emerald-700" /></div>
            <h3 className="font-semibold text-sm">Rule Engine</h3>
          </div>
          <p className="text-xs text-gray-600">Deterministic clinical safety, dosing, contraindications, escalation</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-purple-500">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center"><MapPin className="w-4 h-4 text-purple-700" /></div>
            <h3 className="font-semibold text-sm">Offline First</h3>
          </div>
          <p className="text-xs text-gray-600">Cached protocols, local calculations, syncs when connected</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-amber-500">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center"><Clock className="w-4 h-4 text-amber-700" /></div>
            <h3 className="font-semibold text-sm">Audit Trail</h3>
          </div>
          <p className="text-xs text-gray-600">Immutable logs of all actions, confirmations, and decisions</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b"><h2 className="font-semibold text-gray-800">Platform Roadmap</h2></div>
        <div className="divide-y">
          <ModuleCard icon={<Stethoscope className="w-5 h-5" />} title="Maternal Emergencies" status="active" desc="PPH, preeclampsia, sepsis" />
          <ModuleCard icon={<Baby className="w-5 h-5" />} title="Pediatric Emergencies" status="coming" desc="Sepsis, malaria, dehydration" />
          <ModuleCard icon={<FlaskConical className="w-5 h-5" />} title="SickleSafe" status="coming" desc="Crisis management, genetic counseling" />
          <ModuleCard icon={<Syringe className="w-5 h-5" />} title="MalariaShield" status="coming" desc="Clinical + public health intelligence" />
        </div>
      </div>
    </div>
  )
}

function ModuleCard({ icon, title, status, desc }: { icon: React.ReactNode, title: string, status: string, desc: string }) {
  return (
    <div className="p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${status === 'active' ? 'bg-rose-100 text-rose-700' : 'bg-gray-100 text-gray-400'}`}>{icon}</div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h3 className={`font-medium ${status === 'active' ? 'text-gray-900' : 'text-gray-500'}`}>{title}</h3>
          {status === 'active' && <span className="bg-emerald-100 text-emerald-700 text-[10px] px-1.5 py-0.5 rounded font-medium">ACTIVE</span>}
          {status === 'coming' && <span className="bg-gray-100 text-gray-500 text-[10px] px-1.5 py-0.5 rounded font-medium">COMING SOON</span>}
        </div>
        <p className="text-xs text-gray-500">{desc}</p>
      </div>
    </div>
  )
}
