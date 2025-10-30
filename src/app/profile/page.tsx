'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { SOUTH_AFRICAN_BANKS } from '@/lib/config'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, PartyPopper, X } from 'lucide-react'

type ProfileForm = {
  address_line1: string
  address_line2: string
  city: string
  province: string
  postal_code: string
  country: string
  bank_name: string
  bank_account_number: string
  bank_branch_code: string
  bank_account_type: string
  bank_account_holder: string
  id_number: string
}

export default function ProfilePage() {
  const { userProfile, refreshProfile, loading: authLoading } = useAuth()
  const [form, setForm] = useState<ProfileForm>({
    address_line1: '',
    address_line2: '',
    city: '',
    province: '',
    postal_code: '',
    country: 'South Africa',
    bank_name: '',
    bank_account_number: '',
    bank_branch_code: '',
    bank_account_type: '',
    bank_account_holder: '',
    id_number: ''
  })
  const [saving, setSaving] = useState(false)
  const [formLoading, setFormLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [showSuccessModal, setShowSuccessModal] = useState(false)

  useEffect(() => {
    if (!userProfile) {
      setFormLoading(false)
      return
    }
    // Populate form with existing user data
    setForm({
      address_line1: userProfile.address_line1 || '',
      address_line2: userProfile.address_line2 || '',
      city: userProfile.city || '',
      province: userProfile.province || '',
      postal_code: userProfile.postal_code || '',
      country: userProfile.country || 'South Africa',
      bank_name: userProfile.bank_name || '',
      bank_account_number: userProfile.bank_account_number || '',
      bank_branch_code: userProfile.bank_branch_code || '',
      bank_account_type: userProfile.bank_account_type || '',
      bank_account_holder: userProfile.bank_account_holder || userProfile.name || '',
      id_number: userProfile.id_number || ''
    })
    setFormLoading(false)
  }, [userProfile])

  const handleChange = (field: keyof ProfileForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userProfile) return
    setSaving(true)
    setError('')
    setShowSuccessModal(false)
    try {
      const { error: upErr } = await supabase
        .from('users')
        .update({
          address_line1: form.address_line1 || null,
          address_line2: form.address_line2 || null,
          city: form.city || null,
          province: form.province || null,
          postal_code: form.postal_code || null,
          country: form.country || null,
          bank_name: form.bank_name || null,
          bank_account_number: form.bank_account_number || null,
          bank_branch_code: form.bank_branch_code || null,
          bank_account_type: form.bank_account_type || null,
          bank_account_holder: form.bank_account_holder || null,
          id_number: form.id_number || null,
        })
        .eq('id', userProfile.id)

      if (upErr) throw upErr
      
      // Show celebratory modal
      setShowSuccessModal(true)
      
      // Refresh profile in background (don't block UI)
      refreshProfile().catch(err => console.error('Error refreshing profile:', err))
    } catch (err: any) {
      setError(err?.message || 'Failed to save profile. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (authLoading || formLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!userProfile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full card text-center">
          <p className="text-gray-700 mb-4">Please sign in to manage your profile.</p>
          <Link href="/login" className="btn-primary">Go to Login</Link>
        </div>
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
              <Link href="/dashboard" className="flex items-center text-gray-600 hover:text-gray-900 mr-4">
                <ArrowLeft className="h-5 w-5 mr-1" />
                Back to Dashboard
              </Link>
              <div className="flex-shrink-0">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center mr-0 sm:mr-3">
                    <span className="text-white font-bold text-sm">ML</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Your Profile</h1>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">{error}</div>
        )}

        {/* Success Modal */}
        {showSuccessModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
              onClick={() => setShowSuccessModal(false)}
            />
            
            {/* Modal */}
            <div className="flex min-h-full items-center justify-center p-4">
              <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full transform transition-all animate-scale-in">
                {/* Close button */}
                <button
                  onClick={() => setShowSuccessModal(false)}
                  className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>

                {/* Content */}
                <div className="p-8 text-center">
                  {/* Animated checkmark circle */}
                  <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-green-100 mb-6 animate-scale-in-delay">
                    <CheckCircle2 className="h-12 w-12 text-green-600" strokeWidth={2} />
                  </div>

                  {/* Party popper emoji/animation */}
                  <div className="mb-4">
                    <PartyPopper className="h-16 w-16 text-yellow-400 mx-auto animate-bounce" />
                  </div>

                  {/* Success message */}
                  <h2 className="text-3xl font-bold text-gray-900 mb-3">
                    Profile Saved!
                  </h2>
                  <p className="text-lg text-gray-600 mb-6">
                    Your information has been successfully updated and saved to our database.
                  </p>
                  <p className="text-sm text-gray-500 mb-8">
                    You can now receive commissions and orders with your complete profile.
                  </p>

                  {/* Action button */}
                  <button
                    onClick={() => setShowSuccessModal(false)}
                    className="w-full btn-primary py-3 text-lg font-semibold"
                  >
                    Awesome!
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-8">
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Address</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Street address</label>
                <input className="input-field" value={form.address_line1} onChange={e => handleChange('address_line1', e.target.value)} />
              </div>
              <div>
                <label className="label">Address line 2</label>
                <input className="input-field" value={form.address_line2} onChange={e => handleChange('address_line2', e.target.value)} />
              </div>
              <div>
                <label className="label">City</label>
                <input className="input-field" value={form.city} onChange={e => handleChange('city', e.target.value)} />
              </div>
              <div>
                <label className="label">Province</label>
                <input className="input-field" value={form.province} onChange={e => handleChange('province', e.target.value)} />
              </div>
              <div>
                <label className="label">Postal code</label>
                <input className="input-field" value={form.postal_code} onChange={e => handleChange('postal_code', e.target.value)} />
              </div>
              <div>
                <label className="label">Country</label>
                <input className="input-field" value={form.country} onChange={e => handleChange('country', e.target.value)} />
              </div>
            </div>
          </div>

          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Bank Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Bank name</label>
                <select className="input-field" value={form.bank_name} onChange={e => {
                  const selectedBankName = e.target.value
                  handleChange('bank_name', selectedBankName)
                  // Auto-fill branch code when bank is selected
                  const selectedBank = SOUTH_AFRICAN_BANKS.find(b => b.name === selectedBankName)
                  if (selectedBank) {
                    handleChange('bank_branch_code', selectedBank.universalBranchCode)
                  }
                }}>
                  <option value="">Select a bank</option>
                  {SOUTH_AFRICAN_BANKS.map(bank => (
                    <option key={bank.name} value={bank.name}>{bank.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Account holder</label>
                <input className="input-field" value={form.bank_account_holder} onChange={e => handleChange('bank_account_holder', e.target.value)} />
              </div>
              <div>
                <label className="label">Account number</label>
                <input className="input-field" value={form.bank_account_number} onChange={e => handleChange('bank_account_number', e.target.value)} />
              </div>
              <div>
                <label className="label">Account type</label>
                <select className="input-field" value={form.bank_account_type} onChange={e => handleChange('bank_account_type', e.target.value)}>
                  <option value="">Select account type</option>
                  <option value="Current">Current Account</option>
                  <option value="Savings">Savings Account</option>
                  <option value="Student">Student Account</option>
                  <option value="Transmission">Transmission Account</option>
                  <option value="Investment">Investment Account</option>
                  <option value="Business">Business Account</option>
                  <option value="Money Market">Money Market Account</option>
                  <option value="Fixed Deposit">Fixed Deposit Account</option>
                  <option value="Cheque">Cheque Account</option>
                  <option value="Premium">Premium Account</option>
                  <option value="Gold">Gold Account</option>
                  <option value="Platinum">Platinum Account</option>
                  <option value="Business Current">Business Current Account</option>
                  <option value="Business Savings">Business Savings Account</option>
                </select>
              </div>
              <div>
                <label className="label">Branch code</label>
                <input className="input-field" value={form.bank_branch_code} onChange={e => handleChange('bank_branch_code', e.target.value)} />
              </div>
            </div>
          </div>

          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Verification</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">ID number</label>
                <input className="input-field" value={form.id_number} onChange={e => handleChange('id_number', e.target.value)} />
              </div>
            </div>
          </div>

          <div className="flex justify-end items-center gap-4">
            {saving && (
              <span className="text-sm text-gray-600 flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600 mr-2"></div>
                Saving to database...
              </span>
            )}
            <button type="submit" className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed" disabled={saving}>
              {saving ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </div>
              ) : (
                'Save Profile'
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}


