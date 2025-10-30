'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { AlertModal } from '@/components/Modal'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { generateUniqueIBONumber, generateUniqueSponsorNumber } from '@/lib/utils'
import { Eye, EyeOff, Mail, Lock, User, Phone, AlertCircle, CheckCircle } from 'lucide-react'

export default function SignupPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    sponsorId: '',
    iboNumber: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showErrorModal, setShowErrorModal] = useState(false)
  const [sponsorInfo, setSponsorInfo] = useState<any>(null)
  const [sponsorLoading, setSponsorLoading] = useState(false)

  const { signUp } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Check for sponsor in URL parameters (format: name-sponsor_number or just sponsor_number)
    const sponsorParam = searchParams.get('sponsor')
    if (sponsorParam) {
      // Sponsor param can be: "john-doe-SP-XXXX" or just "SP-XXXX" or old format "IBO-XXXX"
      setFormData(prev => ({ ...prev, sponsorId: sponsorParam }))
      fetchSponsorInfo(sponsorParam)
    }

    // Generate unique IBO number
    const generateNumbers = async () => {
      try {
        const iboNum = await generateUniqueIBONumber(supabase)
        setFormData(prev => ({ ...prev, iboNumber: iboNum }))
      } catch (err) {
        console.error('Error generating IBO number:', err)
        // Fallback to timestamp-based number
        const timestamp = Date.now().toString(36)
        setFormData(prev => ({ ...prev, iboNumber: `IBO-${timestamp}`.toUpperCase() }))
      }
    }
    generateNumbers()
  }, [searchParams])

  const fetchSponsorInfo = async (sponsorId: string) => {
    if (!sponsorId || sponsorId.trim().length === 0) {
      setSponsorInfo(null)
      setError('')
      return
    }

    setSponsorLoading(true)
    setError('')
    setShowErrorModal(false)
    
    try {
      const cleanId = sponsorId.trim()
      const parts = cleanId.split('-')
      
      // Extract IBO number or sponsor number from URL format
      // Format: "john-doe-IBO-ABC123" → extract "IBO-ABC123"
      // Format: "john-doe-SP-ABC123" → extract "SP-ABC123"
      let iboNumber: string | null = null
      let sponsorNumber: string | null = null
      let userId: string | null = null
      
      // Check if it looks like UUID (36 chars with dashes)
      if (cleanId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        userId = cleanId
      }
      // Check if ends with IBO-XXXX pattern (format: name-IBO-XXXX)
      else if (parts.length >= 3 && parts[parts.length - 2] === 'IBO') {
        iboNumber = parts.slice(-2).join('-') // Get "IBO-XXXX"
      }
      // Check if ends with SP-XXXX pattern (format: name-SP-XXXX)
      else if (parts.length >= 3 && parts[parts.length - 2] === 'SP') {
        sponsorNumber = parts.slice(-2).join('-') // Get "SP-XXXX"
      }
      // Check if ends with ADM-XXXX pattern (format: name-ADM-XXXX)
      else if (parts.length >= 3 && parts[parts.length - 2] === 'ADM') {
        iboNumber = parts.slice(-2).join('-') // Get "ADM-XXXX" - search by admin_number
        sponsorNumber = parts.slice(-2).join('-') // Also try as sponsor
      }
      // Check if starts with IBO-
      else if (cleanId.startsWith('IBO-')) {
        iboNumber = cleanId
      }
      // Check if starts with SP-
      else if (cleanId.startsWith('SP-')) {
        sponsorNumber = cleanId
      }
      // Check if starts with ADM-
      else if (cleanId.startsWith('ADM-')) {
        iboNumber = cleanId // Will search by admin_number
        sponsorNumber = cleanId
      }
      
      // Try queries in order of likelihood
      let data = null
      let error = null
      
      // 1. Try by IBO number if we extracted it (most common format)
      if (iboNumber) {
        const result = await supabase
          .from('users')
          .select('name, email, ibo_number, sponsor_number, id')
          .eq('ibo_number', iboNumber)
          .single()
        
        if (!result.error && result.data) {
          data = result.data
          error = null
        } else {
          error = result.error
        }
      }
      
      // 2. Try by sponsor number if we extracted it and IBO didn't work
      if (!data && sponsorNumber) {
        const result = await supabase
          .from('users')
          .select('name, email, ibo_number, sponsor_number, id')
          .eq('sponsor_number', sponsorNumber)
          .single()
        
        if (!result.error && result.data) {
          data = result.data
          error = null
        } else {
          error = result.error
        }
      }
      
      // 3. Try by UUID if provided
      if (!data && userId) {
        const result = await supabase
          .from('users')
          .select('name, email, ibo_number, sponsor_number, id')
          .eq('id', userId)
          .single()
        
        if (!result.error && result.data) {
          data = result.data
          error = null
        } else {
          error = result.error
        }
      }
      
      // 4. Try full string as IBO number (fallback)
      if (!data && !iboNumber && !sponsorNumber) {
        const result = await supabase
          .from('users')
          .select('name, email, ibo_number, sponsor_number, id')
          .eq('ibo_number', cleanId)
          .single()
        
        if (!result.error && result.data) {
          data = result.data
          error = null
        } else {
          error = result.error
        }
      }
      
      // 5. Try full string as sponsor number (fallback)
      if (!data && !sponsorNumber) {
        const result = await supabase
          .from('users')
          .select('name, email, ibo_number, sponsor_number, id')
          .eq('sponsor_number', cleanId)
          .single()
        
        if (!result.error && result.data) {
          data = result.data
          error = null
        } else {
          error = result.error
        }
      }
      
      // 6. Try by admin_number if it starts with ADM-
      if (!data && (cleanId.startsWith('ADM-') || (parts.length >= 3 && parts[parts.length - 2] === 'ADM'))) {
        const adminNum = cleanId.startsWith('ADM-') ? cleanId : parts.slice(-2).join('-')
        const result = await supabase
        .from('users')
          .select('name, email, ibo_number, sponsor_number, admin_number, id')
          .eq('admin_number', adminNum)
        .single()

        if (!result.error && result.data) {
          data = result.data
          error = null
      } else {
          error = result.error
        }
      }

      if (data) {
        setSponsorInfo(data)
        setError('')
        console.log('✅ Sponsor found:', data.name, 'IBO:', data.ibo_number)
      } else {
        // Only show error if input is substantial
        if (cleanId.length >= 4) {
          console.error('❌ Sponsor lookup error:', error)
          setError('Invalid sponsor ID or sponsor number')
        }
        setSponsorInfo(null)
      }
    } catch (err: any) {
      console.error('❌ Sponsor lookup exception:', err)
      const cleanId = sponsorId?.trim() || ''
      if (cleanId.length >= 4) {
        setError('Invalid sponsor ID or sponsor number')
      }
      setSponsorInfo(null)
    } finally {
      setSponsorLoading(false)
    }
  }

  const handleSponsorIdChange = async (value: string) => {
    setFormData(prev => ({ ...prev, sponsorId: value }))
    if (value.length > 3) {
      await fetchSponsorInfo(value)
    } else {
      setSponsorInfo(null)
      setError('')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Require Sponsor ID / IBO Number
    if (!formData.sponsorId || formData.sponsorId.trim().length === 0) {
      setError('Sponsor ID or IBO Number is required')
      setShowErrorModal(true)
      setLoading(false)
      return
    }

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      setShowErrorModal(true)
      setLoading(false)
      return
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters')
      setShowErrorModal(true)
      setLoading(false)
      return
    }

    try {
      // Find sponsor by IBO number, sponsor_number, or ID
      let sponsorId = null
      if (formData.sponsorId) {
        const cleanId = formData.sponsorId.trim()
        const parts = cleanId.split('-')
        
        // Extract IBO number or sponsor number from URL format
        let iboNumber: string | null = null
        let sponsorNumber: string | null = null
        let userId: string | null = null
        
        // Check if it looks like UUID
        if (cleanId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
          userId = cleanId
        }
        // Check if ends with IBO-XXXX pattern (format: name-IBO-XXXX)
        else if (parts.length >= 3 && parts[parts.length - 2] === 'IBO') {
          iboNumber = parts.slice(-2).join('-') // Get "IBO-XXXX"
        }
        // Check if ends with SP-XXXX pattern (format: name-SP-XXXX)
        else if (parts.length >= 3 && parts[parts.length - 2] === 'SP') {
          sponsorNumber = parts.slice(-2).join('-') // Get "SP-XXXX"
        }
        // Check if ends with ADM-XXXX pattern (format: name-ADM-XXXX)
        else if (parts.length >= 3 && parts[parts.length - 2] === 'ADM') {
          sponsorNumber = parts.slice(-2).join('-') // Get "ADM-XXXX"
        }
        // Check if starts with IBO-
        else if (cleanId.startsWith('IBO-')) {
          iboNumber = cleanId
        }
        // Check if starts with SP-
        else if (cleanId.startsWith('SP-')) {
          sponsorNumber = cleanId
        }
        // Check if starts with ADM-
        else if (cleanId.startsWith('ADM-')) {
          sponsorNumber = cleanId
        }
        
        // Try to find sponsor
        let sponsorData = null
        
        // 1. Try by IBO number (most common)
        if (iboNumber) {
          const result = await supabase
            .from('users')
            .select('id')
            .eq('ibo_number', iboNumber)
            .single()
          
          if (!result.error && result.data) {
            sponsorData = result.data
          }
        }
        
        // 2. Try by sponsor number if IBO didn't work
        if (!sponsorData && sponsorNumber) {
          const result = await supabase
            .from('users')
            .select('id')
            .eq('sponsor_number', sponsorNumber)
            .single()
          
          if (!result.error && result.data) {
            sponsorData = result.data
          }
        }
        
        // 3. Try by UUID
        if (!sponsorData && userId) {
          const result = await supabase
            .from('users')
            .select('id')
            .eq('id', userId)
            .single()
          
          if (!result.error && result.data) {
            sponsorData = result.data
          }
        }
        
        // 4. Try full string as IBO (fallback)
        if (!sponsorData && !iboNumber && !sponsorNumber) {
          const result = await supabase
            .from('users')
            .select('id')
            .eq('ibo_number', cleanId)
            .single()
          
          if (!result.error && result.data) {
            sponsorData = result.data
          }
        }
        
        // 5. Try full string as sponsor number (fallback)
        if (!sponsorData && !sponsorNumber) {
          const result = await supabase
            .from('users')
            .select('id')
            .eq('sponsor_number', cleanId)
            .single()
          
          if (!result.error && result.data) {
            sponsorData = result.data
          }
        }
        
        // 6. Try by admin_number if it starts with ADM-
        if (!sponsorData && (cleanId.startsWith('ADM-') || (parts.length >= 3 && parts[parts.length - 2] === 'ADM'))) {
          const adminNum = cleanId.startsWith('ADM-') ? cleanId : parts.slice(-2).join('-')
          const result = await supabase
          .from('users')
          .select('id')
            .eq('admin_number', adminNum)
          .single()
          
          if (!result.error && result.data) {
            sponsorData = result.data
          }
        }
        
        if (sponsorData) {
          sponsorId = sponsorData.id
          console.log('✅ Sponsor ID found for signup:', sponsorId)
        } else {
          console.error('❌ Sponsor not found for signup:', cleanId)
          setError('Invalid sponsor ID or sponsor number. Please check and try again.')
          setShowErrorModal(true)
          setLoading(false)
          return
        }
      }

      // Generate unique sponsor number for new user
      const sponsorNumber = await generateUniqueSponsorNumber(supabase)
      
      // Ensure IBO number is also unique (regenerate if it exists)
      let iboNumber = formData.iboNumber
      const { data: existingIbo, error: iboCheckError } = await supabase
        .from('users')
        .select('ibo_number')
        .eq('ibo_number', iboNumber)
        .single()
      
      // If no error (means record found) or if error is not "not found", regenerate
      if (!iboCheckError || iboCheckError.code !== 'PGRST116') {
        // IBO number exists, generate a new unique one
        iboNumber = await generateUniqueIBONumber(supabase)
      }

      const { data, error } = await signUp(formData.email, formData.password, {
        name: formData.name,
        phone: formData.phone,
        ibo_number: iboNumber,
        sponsor_number: sponsorNumber,
        sponsor_id: sponsorId,
      })

      if (error) {
        setError(error.message || 'Failed to create account. Please try again.')
        setShowErrorModal(true)
        console.error('Signup error:', error)
      } else if (data?.user) {
        router.push('/dashboard')
      } else {
        setError('Account creation failed. Please try again.')
        setShowErrorModal(true)
      }
    } catch (err: any) {
      console.error('Signup exception:', err)
      setError(err?.message || 'An unexpected error occurred. Please try again.')
      setShowErrorModal(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-accent-50 flex items-center justify-center p-4 overflow-x-hidden">
      <div className="max-w-md w-full">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-full mb-4">
            <span className="text-2xl font-bold text-white">ML</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Mot-lee Organics</h1>
          <p className="text-gray-600 mt-2">Join Our Premium Network</p>
        </div>

        {/* Signup Form */}
        <div className="card">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6 text-center">
            Create Account
          </h2>

          {/* Errors are shown via modal */}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label" htmlFor="fullName">
                Full Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  id="fullName"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="input-field pl-10"
                  placeholder="Enter your full name"
                  required
                />
              </div>
            </div>

            <div>
              <label className="label" htmlFor="email">
                Email Address <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="input-field pl-10"
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>

            <div>
              <label className="label" htmlFor="phone">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className="input-field pl-10"
                  placeholder="Enter your phone number"
                  required
                />
              </div>
            </div>

            <div>
              <label className="label" htmlFor="sponsorId">
                Sponsor ID or IBO Number <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="sponsorId"
                  type="text"
                  value={formData.sponsorId}
                  onChange={(e) => handleSponsorIdChange(e.target.value)}
                  className="input-field"
                  placeholder="Enter sponsor ID or IBO number"
                  required
                />
                {sponsorLoading && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600"></div>
                  </div>
                )}
              </div>
              {sponsorInfo && (
                <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  <span className="text-green-700 text-sm">
                    Sponsor: {sponsorInfo.name}
                  </span>
                </div>
              )}
            </div>

            <div>
              <label className="label" htmlFor="password">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  className="input-field pl-10 pr-10"
                  placeholder="Create a password"
                  autoComplete="new-password"
                  onPaste={(e) => e.preventDefault()}
                  onDrop={(e) => e.preventDefault()}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="label" htmlFor="confirmPassword">
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className="input-field pl-10 pr-10"
                  placeholder="Confirm your password"
                  autoComplete="new-password"
                  onPaste={(e) => e.preventDefault()}
                  onDrop={(e) => e.preventDefault()}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* IBO number notice removed per request */}

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Creating account...
                </div>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Already have an account?{' '}
              <Link
                href="/login"
                className="text-primary-600 hover:text-primary-700 font-medium"
              >
                Sign in here
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
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
      <AlertModal open={showErrorModal} title="Signup Error" message={error} onClose={() => setShowErrorModal(false)} />
    </div>
  )
}
