import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Activity, Droplets, CheckCircle, Mic, Keyboard, Loader2 } from 'lucide-react'
import { apiFetch } from '../utils/api'

export default function AssessmentPage() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<'structured' | 'nlp'>('structured')
  const [loading, setLoading] = useState(false)
  const [nlpText, setNlpText] = useState('')
  const [extractedData, setExtractedData] = useState<any>(null)
  const [showResources, setShowResources] = useState(false)

  const [form, setForm] = useState({
    age: '29', weight: '72', gestational_age: '39',
    heart_rate: '124', systolic_bp: '88', diastolic_bp: '52', spo2: '96', respiratory_rate: '24',
    ebl: '1100', uterine_tone: 'boggy', placenta_delivered: 'yes', iv_access: true,
    time_since_delivery: '20', delivery_mode: 'vaginal', symptoms: 'dizziness,weakness,ongoing bleeding',
    has_blood_bank: false, has_oxygen: true, has_operating_theatre: false, has_obstetrician: false,
    has_anesthesia_provider: false, has_laboratory: true, has_ultrasound: false, has_icu: false,
    has_ambulance: true, has_emergency_meds: true,
  })

  const handleNlpExtract = async () => {
    if (!nlpText.trim()) return
    setLoading(true)
    try {
      const res = await apiFetch(`/api/v1/intake/nlp?text=${encodeURIComponent(nlpText)}`)
      const data = await res.json()
      setExtractedData(data.extracted_data)
      const ex = data.extracted_data
      setForm(prev => ({
        ...prev,
        age: ex.age?.toString() || prev.age,
        weight: ex.weight_kg?.toString() || prev.weight,
        heart_rate: ex.heart_rate_bpm?.toString() || prev.heart_rate,
        systolic_bp: ex.systolic_bp?.toString() || prev.systolic_bp,
        diastolic_bp: ex.diastolic_bp?.toString() || prev.diastolic_bp,
        spo2: ex.spo2_percent?.toString() || prev.spo2,
        ebl: ex.estimated_blood_loss_ml?.toString() || prev.ebl,
        uterine_tone: ex.uterine_tone || prev.uterine_tone,
        delivery_mode: ex.delivery_mode || prev.delivery_mode,
        time_since_delivery: ex.time_since_delivery_minutes?.toString() || prev.time_since_delivery,
      }))
    } catch (e) { alert('Extraction failed') } finally { setLoading(false) }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const payload = {
      patient: {
        age: Number(form.age) || null, weight_kg: Number(form.weight) || null,
        gestational_age_weeks: Number(form.gestational_age) || null,
        is_pregnant: false, allergies: [], medical_history: [], language_preference: 'english',
      },
      vitals: {
        heart_rate_bpm: Number(form.heart_rate) || null, systolic_bp: Number(form.systolic_bp) || null,
        diastolic_bp: Number(form.diastolic_bp) || null, respiratory_rate: Number(form.respiratory_rate) || null,
        spo2_percent: Number(form.spo2) || null, uterine_tone: form.uterine_tone,
      },
      assessment_data: {
        estimated_blood_loss_ml: Number(form.ebl) || null,
        time_since_delivery_minutes: Number(form.time_since_delivery) || null,
        delivery_mode: form.delivery_mode, placenta_delivered: form.placenta_delivered === 'yes',
        iv_access: form.iv_access, facility_level: 'secondary',
        facility_resources: {
          has_blood_bank: form.has_blood_bank, has_oxygen: form.has_oxygen,
          has_operating_theatre: form.has_operating_theatre, has_obstetrician: form.has_obstetrician,
          has_anesthesia_provider: form.has_anesthesia_provider, has_laboratory: form.has_laboratory,
          has_ultrasound: form.has_ultrasound, has_icu: form.has_icu,
          has_ambulance: form.has_ambulance, has_emergency_meds: form.has_emergency_meds,
        },
        symptoms: form.symptoms.split(',').map(s => s.trim()).filter(Boolean),
        available_medications: ['oxytocin', 'tranexamic_acid', 'misoprostol'],
      }
    }
    try {
      const res = await apiFetch('/api/v1/assess/pph', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      })
      const data = await res.json()
      navigate('/results', { state: data })
    } catch (err) { alert('Assessment failed. Check backend connection.') } finally { setLoading(false) }
  }

  const inputClass = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none"
  const labelClass = "block text-xs font-medium text-gray-700 mb-1"

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow p-4 border-l-4 border-rose-600">
        <h2 className="text-lg font-semibold flex items-center gap-2 text-gray-900">
          <AlertTriangle className="w-5 h-5 text-rose-600" /> Postpartum Hemorrhage Assessment
        </h2>
        <p className="text-sm text-gray-600 mt-1">Enter patient details. All medication recommendations require confirmation.</p>
      </div>

      <div className="flex bg-gray-100 rounded-lg p-1">
        <button onClick={() => setMode('structured')} className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-md text-sm font-medium transition ${mode === 'structured' ? 'bg-white shadow text-rose-700' : 'text-gray-500'}`}>
          <Keyboard className="w-4 h-4" /> Structured
        </button>
        <button onClick={() => setMode('nlp')} className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-md text-sm font-medium transition ${mode === 'nlp' ? 'bg-white shadow text-rose-700' : 'text-gray-500'}`}>
          <Mic className="w-4 h-4" /> Natural Language
        </button>
      </div>

      {mode === 'nlp' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <label className="block text-sm font-medium text-blue-900 mb-2">Describe the patient in natural language</label>
          <textarea className="w-full border border-blue-300 rounded-lg px-3 py-2 text-sm h-24 resize-none" placeholder="29-year-old woman twenty minutes after vaginal delivery..." value={nlpText} onChange={e => setNlpText(e.target.value)} />
          <button onClick={handleNlpExtract} disabled={loading || !nlpText.trim()} className="mt-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Extract with Gemini'}
          </button>
          {extractedData && (
            <div className="mt-3 bg-white rounded p-3 text-xs">
              <p className="font-medium text-blue-900 mb-1">Extracted fields (verify before use):</p>
              <pre className="text-gray-600 overflow-x-auto">{JSON.stringify(extractedData, null, 2)}</pre>
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <section className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <span className="w-6 h-6 bg-rose-100 rounded-full flex items-center justify-center text-xs text-rose-700 font-bold">1</span> Patient Information
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelClass}>Age</label><input type="number" className={inputClass} value={form.age} onChange={e => setForm({...form, age: e.target.value})} required /></div>
            <div><label className={labelClass}>Weight (kg)</label><input type="number" className={inputClass} value={form.weight} onChange={e => setForm({...form, weight: e.target.value})} required /></div>
            <div><label className={labelClass}>Gestational Age (wks)</label><input type="number" className={inputClass} value={form.gestational_age} onChange={e => setForm({...form, gestational_age: e.target.value})} /></div>
            <div><label className={labelClass}>Time Since Delivery (min)</label><input type="number" className={inputClass} value={form.time_since_delivery} onChange={e => setForm({...form, time_since_delivery: e.target.value})} /></div>
          </div>
        </section>

        <section className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <span className="w-6 h-6 bg-rose-100 rounded-full flex items-center justify-center text-xs text-rose-700 font-bold">2</span> <Activity className="w-4 h-4" /> Vital Signs
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelClass}>Heart Rate</label><input type="number" className={inputClass} value={form.heart_rate} onChange={e => setForm({...form, heart_rate: e.target.value})} required /></div>
            <div><label className={labelClass}>Systolic BP</label><input type="number" className={inputClass} value={form.systolic_bp} onChange={e => setForm({...form, systolic_bp: e.target.value})} required /></div>
            <div><label className={labelClass}>Diastolic BP</label><input type="number" className={inputClass} value={form.diastolic_bp} onChange={e => setForm({...form, diastolic_bp: e.target.value})} required /></div>
            <div><label className={labelClass}>SpO2 (%)</label><input type="number" className={inputClass} value={form.spo2} onChange={e => setForm({...form, spo2: e.target.value})} /></div>
            <div><label className={labelClass}>Respiratory Rate</label><input type="number" className={inputClass} value={form.respiratory_rate} onChange={e => setForm({...form, respiratory_rate: e.target.value})} /></div>
          </div>
        </section>

        <section className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <span className="w-6 h-6 bg-rose-100 rounded-full flex items-center justify-center text-xs text-rose-700 font-bold">3</span> <Droplets className="w-4 h-4" /> Obstetric Details
          </h3>
          <div className="space-y-3">
            <div><label className={labelClass}>Estimated Blood Loss (mL)</label><input type="number" className={inputClass} value={form.ebl} onChange={e => setForm({...form, ebl: e.target.value})} required /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelClass}>Uterine Tone</label><select className={inputClass} value={form.uterine_tone} onChange={e => setForm({...form, uterine_tone: e.target.value})}><option value="">Select...</option><option value="firm">Firm</option><option value="boggy">Boggy</option><option value="contracting">Contracting</option></select></div>
              <div><label className={labelClass}>Delivery Mode</label><select className={inputClass} value={form.delivery_mode} onChange={e => setForm({...form, delivery_mode: e.target.value})}><option value="vaginal">Vaginal</option><option value="cesarean">Cesarean</option><option value="assisted">Assisted</option></select></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelClass}>Placenta Delivered?</label><select className={inputClass} value={form.placenta_delivered} onChange={e => setForm({...form, placenta_delivered: e.target.value})}><option value="yes">Yes</option><option value="no">No</option></select></div>
              <div className="flex items-center pt-5"><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.iv_access} onChange={e => setForm({...form, iv_access: e.target.checked})} className="w-4 h-4 text-rose-600" /><span className="text-sm text-gray-700">IV Access Available</span></label></div>
            </div>
            <div><label className={labelClass}>Symptoms (comma-separated)</label><input type="text" className={inputClass} value={form.symptoms} onChange={e => setForm({...form, symptoms: e.target.value})} /></div>
          </div>
        </section>

        <section className="bg-white rounded-lg shadow p-4">
          <button type="button" onClick={() => setShowResources(!showResources)} className="w-full flex items-center justify-between font-semibold text-gray-800">
            <span className="flex items-center gap-2"><span className="w-6 h-6 bg-rose-100 rounded-full flex items-center justify-center text-xs text-rose-700 font-bold">4</span> Facility Resources (African Context)</span>
            <span className="text-gray-400">{showResources ? '▲' : '▼'}</span>
          </button>
          {showResources && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {[
                { key: 'has_blood_bank', label: 'Blood Bank' }, { key: 'has_oxygen', label: 'Oxygen' },
                { key: 'has_operating_theatre', label: 'Operating Theatre' }, { key: 'has_obstetrician', label: 'Obstetrician' },
                { key: 'has_anesthesia_provider', label: 'Anesthesia Provider' }, { key: 'has_laboratory', label: 'Laboratory' },
                { key: 'has_ultrasound', label: 'Ultrasound' }, { key: 'has_icu', label: 'ICU' },
                { key: 'has_ambulance', label: 'Ambulance' }, { key: 'has_emergency_meds', label: 'Emergency Meds' },
              ].map(res => (
                <label key={res.key} className="flex items-center gap-2 p-2 bg-gray-50 rounded cursor-pointer">
                  <input type="checkbox" checked={(form as any)[res.key]} onChange={e => setForm({...form, [res.key]: e.target.checked})} className="w-4 h-4 text-rose-600" />
                  <span className="text-sm text-gray-700">{res.label}</span>
                </label>
              ))}
            </div>
          )}
        </section>

        <button type="submit" disabled={loading} className="w-full bg-rose-700 text-white py-3.5 rounded-lg font-bold text-lg hover:bg-rose-800 disabled:opacity-50 shadow-lg flex items-center justify-center gap-2">
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
          {loading ? 'Analyzing...' : 'Run PPH Assessment'}
        </button>
      </form>
    </div>
  )
}
