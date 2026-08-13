import { ReactNode, useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { HeartPulse, WifiOff, Wifi, Menu, X, Shield } from 'lucide-react'

export default function Layout({ children }: { children: ReactNode }) {
  const [isOffline, setIsOffline] = useState(!navigator.onLine)
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    const handleOffline = () => setIsOffline(true)
    const handleOnline = () => setIsOffline(false)
    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)
    return () => {
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
    }
  }, [])

  const navItems = [
    { path: '/', label: 'Dashboard' },
    { path: '/assess', label: 'PPH Assessment' },
    { path: '/simulation', label: 'Simulation' },
  ]

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-rose-700 text-white shadow-md sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <HeartPulse className="w-6 h-6" />
            <div>
              <h1 className="text-lg font-bold leading-tight">MamaSafe AI</h1>
              <p className="text-[10px] opacity-80 leading-tight">Clinical Decision Support</p>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            {isOffline ? (
              <div className="flex items-center gap-1 bg-amber-600 px-2 py-1 rounded text-xs">
                <WifiOff className="w-3 h-3" /><span>Offline</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 bg-emerald-600 px-2 py-1 rounded text-xs">
                <Wifi className="w-3 h-3" /><span>Online</span>
              </div>
            )}
            <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden">
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <nav className="md:hidden border-t border-rose-600">
            {navItems.map(item => (
              <Link key={item.path} to={item.path} onClick={() => setMenuOpen(false)}
                className={`block px-4 py-2 text-sm ${location.pathname === item.path ? 'bg-rose-800' : ''}`}>
                {item.label}
              </Link>
            ))}
          </nav>
        )}
      </header>
      <nav className="hidden md:block bg-rose-800 text-white">
        <div className="max-w-3xl mx-auto px-4 flex gap-6">
          {navItems.map(item => (
            <Link key={item.path} to={item.path}
              className={`py-2 text-sm border-b-2 ${location.pathname === item.path ? 'border-white' : 'border-transparent opacity-70'}`}>
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
      <div className="bg-amber-50 border-b border-amber-200">
        <div className="max-w-3xl mx-auto px-4 py-1.5 flex items-center gap-2">
          <Shield className="w-3 h-3 text-amber-700" />
          <p className="text-[11px] text-amber-800">
            Decision support only. All clinical actions require human confirmation. Not for autonomous diagnosis.
          </p>
        </div>
      </div>
      <main className="flex-1 max-w-3xl mx-auto w-full p-4">{children}</main>
      <footer className="bg-gray-100 border-t text-center py-3 text-xs text-gray-500">
        <p>MamaSafe AI v0.1.0-alpha — Simulation & Educational Use Only</p>
        <p className="mt-0.5">Built for Google Africa Applied AI Lab</p>
      </footer>
    </div>
  )
}
