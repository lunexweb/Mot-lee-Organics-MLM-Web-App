'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { 
  Settings, 
  Save,
  RefreshCw,
  DollarSign,
  Users,
  Mail,
  Phone,
  Building,
  AlertCircle,
  CheckCircle
} from 'lucide-react'

interface CommissionRate {
  id: string
  level: number
  percentage: number
  is_active: boolean
}

interface SystemSettings {
  company_name: string
  company_email: string
  company_phone: string
  company_address: string
  website_url: string
  support_email: string
  commission_rates: CommissionRate[]
}

export default function SystemSettings() {
  const { user, userProfile, loading: authLoading } = useAuth()
  const [settings, setSettings] = useState<SystemSettings>({
    company_name: 'Mot-lee Organics',
    company_email: 'info@motleeorganics.com',
    company_phone: '+27 123 456 7890',
    company_address: '123 Organic Street, Cape Town, South Africa',
    website_url: 'https://motleeorganics.com',
    support_email: 'support@motleeorganics.com',
    commission_rates: []
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error'>('success')

  useEffect(() => {
    if (userProfile?.role === 'admin') {
      fetchSettings()
    }
  }, [userProfile])

  const fetchSettings = async () => {
    try {
      // Fetch commission rates
      const { data: commissionRates, error } = await supabase
        .from('commission_rates')
        .select('*')
        .order('level', { ascending: true })

      if (error) {
        console.error('Error fetching commission rates:', error)
        return
      }

      setSettings(prev => ({
        ...prev,
        commission_rates: commissionRates || []
      }))
    } catch (error) {
      console.error('Error fetching settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveSettings = async () => {
    setSaving(true)
    setMessage('')

    try {
      // Update commission rates
      for (const rate of settings.commission_rates) {
        const { error } = await supabase
          .from('commission_rates')
          .update({
            percentage: rate.percentage,
            is_active: rate.is_active
          })
          .eq('id', rate.id)

        if (error) {
          console.error('Error updating commission rate:', error)
          setMessage('Error updating commission rates')
          setMessageType('error')
          return
        }
      }

      setMessage('Settings saved successfully!')
      setMessageType('success')
    } catch (error) {
      console.error('Error saving settings:', error)
      setMessage('Error saving settings')
      setMessageType('error')
    } finally {
      setSaving(false)
      setTimeout(() => setMessage(''), 3000)
    }
  }

  const handleCommissionRateChange = (id: string, field: 'percentage' | 'is_active', value: number | boolean) => {
    setSettings(prev => ({
      ...prev,
      commission_rates: prev.commission_rates.map(rate =>
        rate.id === id ? { ...rate, [field]: value } : rate
      )
    }))
  }

  const resetToDefaults = async () => {
    if (!confirm('Are you sure you want to reset commission rates to defaults?')) return

    try {
      const defaultRates = [
        { id: '', level: 1, percentage: 0.10, is_active: true },
        { id: '', level: 2, percentage: 0.05, is_active: true },
        { id: '', level: 3, percentage: 0.02, is_active: true }
      ]

      // Update each rate
      for (const rate of defaultRates) {
        const { error } = await supabase
          .from('commission_rates')
          .update({
            percentage: rate.percentage,
            is_active: rate.is_active
          })
          .eq('level', rate.level)

        if (error) {
          console.error('Error resetting commission rate:', error)
          return
        }
      }

      await fetchSettings()
      setMessage('Commission rates reset to defaults!')
      setMessageType('success')
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      console.error('Error resetting settings:', error)
      setMessage('Error resetting settings')
      setMessageType('error')
    }
  }

  // Wait for auth AND profile to load before checking role
  if (authLoading || (user && !userProfile)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  // Only show Access Denied when we KNOW user is not admin (profile loaded + role confirmed)
  if (user && userProfile && userProfile.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Settings className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access system settings.</p>
          <a href="/dashboard" className="btn-primary mt-4 inline-block">
            Go to Dashboard
          </a>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center mr-0 sm:mr-3">
                    <span className="text-white font-bold text-sm">ML</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <a
                href="/admin"
                className="text-gray-600 hover:text-gray-900"
              >
                Admin Dashboard
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">System Settings</h2>
          <p className="text-gray-600">Configure your MLM platform settings</p>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg flex items-center ${
            messageType === 'success' 
              ? 'bg-green-50 border border-green-200' 
              : 'bg-red-50 border border-red-200'
          }`}>
            {messageType === 'success' ? (
              <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
            )}
            <span className={`text-sm ${
              messageType === 'success' ? 'text-green-700' : 'text-red-700'
            }`}>
              {message}
            </span>
          </div>
        )}

        {/* Company Information */}
        <div className="card mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Company Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="label">Company Name</label>
              <input
                type="text"
                value={settings.company_name}
                onChange={(e) => setSettings(prev => ({ ...prev, company_name: e.target.value }))}
                className="input-field"
              />
            </div>
            
            <div>
              <label className="label">Company Email</label>
              <input
                type="email"
                value={settings.company_email}
                onChange={(e) => setSettings(prev => ({ ...prev, company_email: e.target.value }))}
                className="input-field"
              />
            </div>
            
            <div>
              <label className="label">Company Phone</label>
              <input
                type="tel"
                value={settings.company_phone}
                onChange={(e) => setSettings(prev => ({ ...prev, company_phone: e.target.value }))}
                className="input-field"
              />
            </div>
            
            <div>
              <label className="label">Website URL</label>
              <input
                type="url"
                value={settings.website_url}
                onChange={(e) => setSettings(prev => ({ ...prev, website_url: e.target.value }))}
                className="input-field"
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="label">Company Address</label>
              <textarea
                value={settings.company_address}
                onChange={(e) => setSettings(prev => ({ ...prev, company_address: e.target.value }))}
                className="input-field"
                rows={3}
              />
            </div>
            
            <div>
              <label className="label">Support Email</label>
              <input
                type="email"
                value={settings.support_email}
                onChange={(e) => setSettings(prev => ({ ...prev, support_email: e.target.value }))}
                className="input-field"
              />
            </div>
          </div>
        </div>

        {/* Commission Rates */}
        <div className="card mb-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Commission Rates</h3>
            <button
              onClick={resetToDefaults}
              className="btn-secondary flex items-center"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Reset to Defaults
            </button>
          </div>
          
          <div className="space-y-6">
            {settings.commission_rates.map((rate) => (
              <div key={rate.id} className="border border-gray-200 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full mr-3 ${
                      rate.level === 1 ? 'bg-green-500' :
                      rate.level === 2 ? 'bg-blue-500' :
                      'bg-purple-500'
                    }`}></div>
                    <h4 className="text-md font-medium text-gray-900">
                      Level {rate.level} Commission
                    </h4>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={rate.is_active}
                      onChange={(e) => handleCommissionRateChange(rate.id, 'is_active', e.target.checked)}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">Active</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Commission Percentage</label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="1"
                        value={rate.percentage}
                        onChange={(e) => handleCommissionRateChange(rate.id, 'percentage', parseFloat(e.target.value))}
                        className="input-field pr-8"
                      />
                      <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
                        %
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {rate.level === 1 && 'Direct referrals (10% recommended)'}
                      {rate.level === 2 && 'Second level referrals (5% recommended)'}
                      {rate.level === 3 && 'Third level referrals (2% recommended)'}
                    </p>
                  </div>
                  
                  <div>
                    <label className="label">Display Rate</label>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <span className="text-lg font-semibold text-gray-900">
                        {(rate.percentage * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </div>
            ) : (
              <div className="flex items-center">
                <Save className="h-4 w-4 mr-2" />
                Save Settings
              </div>
            )}
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center">
            <p className="text-sm text-gray-500">
              Built by{' '}
              <a
                href="https://www.lunexweb.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 hover:text-primary-700 font-medium"
              >
                lunexweb
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
