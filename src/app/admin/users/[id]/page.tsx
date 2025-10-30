'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { DollarSign, ArrowLeft } from 'lucide-react'

interface Profile {
  id: string
  name: string
  email: string
  phone: string | null
  ibo_number: string
  role: string
  status: string
  created_at?: string
  updated_at?: string
  address_line1?: string | null
  address_line2?: string | null
  city?: string | null
  province?: string | null
  postal_code?: string | null
  country?: string | null
  bank_name?: string | null
  bank_account_number?: string | null
  bank_branch_code?: string | null
  bank_account_type?: string | null
  bank_account_holder?: string | null
  id_number?: string | null
  sponsor_id?: string | null
  sponsor_number?: string | null
  admin_number?: string | null
}

interface Stats {
  id: string
  orders_count: number
  orders_total: number
  commissions_count: number
  commissions_total: number
  commissions_pending_total: number
  commissions_paid_total: number
  level1_total: number
  level2_total: number
  level3_total: number
}

interface CommissionRow {
  commission_id: string
  earner_id: string
  order_id: string
  order_number: string
  order_total: number
  level: number
  status: 'pending' | 'paid'
  commission_amount: number
  created_at: string
  buyer_name?: string
  buyer_email?: string
}

export default function AdminUserDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { userProfile } = useAuth()
  const userId = (params?.id as string) || ''

  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [commissions, setCommissions] = useState<CommissionRow[]>([])
  const [sponsor, setSponsor] = useState<{ id: string; name: string; email: string; ibo_number: string } | null>(null)

  useEffect(() => {
    if (!userProfile) return
    if (userProfile.role !== 'admin') {
      router.replace('/dashboard')
      return
    }
    fetchAll()
  }, [userProfile, userId])

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [{ data: p }, { data: s }, { data: c }] = await Promise.all([
        supabase.from('v_admin_user_profile').select('*').eq('id', userId).single(),
        supabase.from('v_admin_user_stats').select('*').eq('id', userId).single(),
        supabase
          .from('v_admin_user_commissions_detail')
          .select('*')
          .eq('earner_id', userId)
          .order('created_at', { ascending: false }),
      ])
      setProfile((p as any) || null)
      setStats((s as any) || null)
      setCommissions((c as any) || [])
      // fetch sponsor minimal info if present
      const sponsorId = (p as any)?.sponsor_id || null
      if (sponsorId) {
        const { data: sp } = await supabase
          .from('users')
          .select('id, name, email, ibo_number')
          .eq('id', sponsorId)
          .single()
        setSponsor((sp as any) || null)
      } else {
        setSponsor(null)
      }
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <button onClick={() => router.back()} className="btn-secondary mb-6 inline-flex items-center">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </button>
          <div className="card">
            <div className="text-center py-12">
              <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">User not found</h3>
              <p className="text-gray-600">Please go back and try again.</p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button onClick={() => router.back()} className="btn-secondary mb-6 inline-flex items-center">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </button>

        {/* Profile */}
        <div className="card mb-8">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{profile.name}</h2>
              <p className="text-gray-600">{profile.email} {profile.phone ? `• ${profile.phone}` : ''}</p>
              <p className="text-sm text-gray-500">IBO: {profile.ibo_number} • Role: {profile.role} • Status: {profile.status}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-sm text-gray-700">
            <div>
              <p className="font-medium text-gray-900 mb-1">Address</p>
              <p><span className="font-medium">Address line 1:</span> {profile.address_line1 || '—'}</p>
              <p><span className="font-medium">Address line 2:</span> {profile.address_line2 || '—'}</p>
              <p><span className="font-medium">City:</span> {profile.city || '—'}</p>
              <p><span className="font-medium">Province:</span> {profile.province || '—'}</p>
              <p><span className="font-medium">Postal code:</span> {profile.postal_code || '—'}</p>
              <p><span className="font-medium">Country:</span> {profile.country || '—'}</p>
            </div>
            <div>
              <p className="font-medium text-gray-900 mb-1">Bank</p>
              <p><span className="font-medium">Bank name:</span> {profile.bank_name || '—'}</p>
              <p><span className="font-medium">Account holder:</span> {profile.bank_account_holder || '—'}</p>
              <p><span className="font-medium">Account number:</span> {profile.bank_account_number || '—'}</p>
              <p><span className="font-medium">Branch code:</span> {profile.bank_branch_code || '—'}</p>
              <p><span className="font-medium">Account type:</span> {profile.bank_account_type || '—'}</p>
            </div>
            <div>
              <p className="font-medium text-gray-900 mb-1">Account</p>
              <p><span className="font-medium">Created:</span> {profile.created_at ? new Date(profile.created_at).toLocaleString() : '—'}</p>
              <p><span className="font-medium">Updated:</span> {profile.updated_at ? new Date(profile.updated_at).toLocaleString() : '—'}</p>
              <p><span className="font-medium">Sponsor number:</span> {profile.sponsor_number || '—'}</p>
              <p><span className="font-medium">Admin number:</span> {profile.admin_number || '—'}</p>
              <p><span className="font-medium">ID number:</span> {profile.id_number || '—'}</p>
            </div>
            <div>
              <p className="font-medium text-gray-900 mb-1">Sponsor</p>
              {sponsor ? (
                <p>
                  <a href={`/admin/users/${sponsor.id}`} className="text-primary-700 hover:text-primary-900 font-medium">{sponsor.name}</a>
                  <span className="text-gray-600"> • {sponsor.email}</span>
                  <br />IBO: {sponsor.ibo_number}
                </p>
              ) : (
                <p>—</p>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="card">
              <p className="text-sm text-gray-600">Orders</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.orders_count}</p>
              <p className="text-xs text-gray-500">{formatCurrency(stats.orders_total)}</p>
            </div>
            <div className="card">
              <p className="text-sm text-gray-600">Pending Commissions</p>
              <p className="text-2xl font-semibold text-gray-900">{formatCurrency(stats.commissions_pending_total)}</p>
            </div>
            <div className="card">
              <p className="text-sm text-gray-600">Paid Commissions</p>
              <p className="text-2xl font-semibold text-gray-900">{formatCurrency(stats.commissions_paid_total)}</p>
            </div>
          </div>
        )}

        {/* Commission history */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Commission History</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Buyer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Level</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {commissions.map((c) => (
                  <tr key={c.commission_id}>
                    <td className="px-6 py-4 text-sm">
                      <div className="font-medium text-gray-900">{c.order_number}</div>
                      <div className="text-gray-500">{formatCurrency(c.order_total)}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {c.buyer_name || '—'}
                    </td>
                    <td className="px-6 py-4 text-sm">Level {c.level}</td>
                    <td className="px-6 py-4 text-sm font-semibold">{formatCurrency(c.commission_amount)}</td>
                    <td className="px-6 py-4 text-sm">{c.status}</td>
                    <td className="px-6 py-4 text-sm">{new Date(c.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {commissions.length === 0 && (
            <div className="text-center py-12">
              <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No commissions</h3>
              <p className="text-gray-600">This user has no commission records.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}


