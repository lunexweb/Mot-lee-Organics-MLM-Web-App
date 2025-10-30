'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import { 
  DollarSign, 
  Search,
  Filter,
  CheckCircle,
  Clock,
  User,
  Calendar,
  TrendingUp,
  AlertCircle,
  Download,
  Eye,
  X
} from 'lucide-react'

interface Commission {
  id: string
  commission_amount: number
  level: number
  status: 'pending' | 'paid'
  created_at: string
  user_id: string
  user_name: string
  user_email: string
  user_ibo_number: string
  order_id: string
  order_number: string
  order_total: number
}

interface PayableRow {
  user_id: string
  name: string
  email: string
  ibo_number: string
  bank_name: string | null
  bank_account_number: string | null
  bank_branch_code: string | null
  bank_account_type: string | null
  bank_account_holder: string | null
  pending_count: number
  pending_total: number
  first_pending_at: string | null
  last_pending_at: string | null
}

export default function CommissionManagement() {
  const { user, userProfile, loading: authLoading } = useAuth()
  const [commissions, setCommissions] = useState<Commission[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'paid'>('all')
  const [levelFilter, setLevelFilter] = useState<'all' | '1' | '2' | '3'>('all')
  const [selectedCommissions, setSelectedCommissions] = useState<string[]>([])
  const [bulkAction, setBulkAction] = useState<'pay' | 'none'>('none')
  const [groupByUser, setGroupByUser] = useState(false)
  const [payables, setPayables] = useState<PayableRow[]>([])
  const [payingUserId, setPayingUserId] = useState<string | null>(null)
  const [rateByLevel, setRateByLevel] = useState<Record<number, number>>({ 1: 0.10, 2: 0.05, 3: 0.02 })

  useEffect(() => {
    if (userProfile?.role === 'admin') {
      // Load commission rates for dynamic labels
      supabase
        .from('commission_rates')
        .select('level, percentage, is_active')
        .order('level', { ascending: true })
        .then(({ data, error }) => {
          if (!error && data) {
            const next: Record<number, number> = { 1: 0.10, 2: 0.05, 3: 0.02 }
            data.forEach(r => {
              if (r.is_active) next[r.level as 1|2|3] = Number(r.percentage)
            })
            setRateByLevel(next)
          }
        })

      if (groupByUser) {
        fetchPayables()
      } else {
        fetchCommissions()
      }
    }
  }, [userProfile, groupByUser])

  const fetchCommissions = async () => {
    try {
      const { data: commissionsData, error } = await supabase
        .from('commissions')
        .select(`
          id,
          commission_amount,
          level,
          status,
          created_at,
          user_id,
          order_id,
          users!inner(name, email, ibo_number),
          orders!inner(order_number, total_amount)
        `)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching commissions:', error)
        return
      }

      const transformedCommissions = (commissionsData || []).map((commission: any) => ({
        id: commission.id,
        commission_amount: commission.commission_amount,
        level: commission.level,
        status: commission.status,
        created_at: commission.created_at,
        user_id: commission.user_id,
        user_name: commission.users?.name || 'Unknown',
        user_email: commission.users?.email || 'Unknown',
        user_ibo_number: commission.users?.ibo_number || 'Unknown',
        order_id: commission.order_id,
        order_number: commission.orders?.order_number || 'Unknown',
        order_total: commission.orders?.total_amount || 0
      }))

      setCommissions(transformedCommissions)
    } catch (error) {
      console.error('Error fetching commissions:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchPayables = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('v_admin_user_payables')
        .select('*')
        .order('pending_total', { ascending: false })

      if (error) {
        console.error('Error fetching payables:', error)
        setPayables([])
        return
      }
      setPayables((data as PayableRow[]) || [])
    } catch (error) {
      console.error('Error fetching payables:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePayAllForUser = async (userId: string) => {
    try {
      setPayingUserId(userId)
      const { error } = await supabase.rpc('pay_user_commissions', {
        p_user_id: userId,
        p_cutoff: new Date().toISOString(),
        p_note: 'Admin batch payout'
      })
      if (error) {
        console.error('Error paying commissions:', error)
        return
      }
      // refresh both lists cautiously
      if (groupByUser) {
        await fetchPayables()
      }
      await fetchCommissions()
    } catch (error) {
      console.error('Error paying commissions:', error)
    } finally {
      setPayingUserId(null)
    }
  }

  const handleUpdateCommissionStatus = async (commissionId: string, newStatus: 'pending' | 'paid') => {
    try {
      const { error } = await supabase
        .from('commissions')
        .update({ status: newStatus })
        .eq('id', commissionId)

      if (error) {
        console.error('Error updating commission status:', error)
        return
      }

      await fetchCommissions()
    } catch (error) {
      console.error('Error updating commission status:', error)
    }
  }

  const handleBulkAction = async () => {
    if (bulkAction === 'pay' && selectedCommissions.length > 0) {
      try {
        const { error } = await supabase
          .from('commissions')
          .update({ status: 'paid' })
          .in('id', selectedCommissions)

        if (error) {
          console.error('Error updating commission status:', error)
          return
        }

        await fetchCommissions()
        setSelectedCommissions([])
        setBulkAction('none')
      } catch (error) {
        console.error('Error updating commission status:', error)
      }
    }
  }

  const handleSelectCommission = (commissionId: string) => {
    setSelectedCommissions(prev => 
      prev.includes(commissionId) 
        ? prev.filter(id => id !== commissionId)
        : [...prev, commissionId]
    )
  }

  const handleSelectAll = () => {
    const filteredIds = filteredCommissions.map(c => c.id)
    setSelectedCommissions(
      selectedCommissions.length === filteredIds.length ? [] : filteredIds
    )
  }

  const filteredCommissions = commissions.filter(commission => {
    const matchesSearch = 
      commission.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      commission.user_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      commission.user_ibo_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      commission.order_number.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || commission.status === statusFilter
    const matchesLevel = levelFilter === 'all' || commission.level.toString() === levelFilter

    return matchesSearch && matchesStatus && matchesLevel
  })

  const getCommissionStats = () => {
    const totalCommissions = commissions.length
    const pendingCommissions = commissions.filter(c => c.status === 'pending').length
    const paidCommissions = commissions.filter(c => c.status === 'paid').length
    const totalPendingAmount = commissions
      .filter(c => c.status === 'pending')
      .reduce((sum, c) => sum + c.commission_amount, 0)
    const totalPaidAmount = commissions
      .filter(c => c.status === 'paid')
      .reduce((sum, c) => sum + c.commission_amount, 0)
    const level1Commissions = commissions.filter(c => c.level === 1).length
    const level2Commissions = commissions.filter(c => c.level === 2).length
    const level3Commissions = commissions.filter(c => c.level === 3).length

    return {
      totalCommissions,
      pendingCommissions,
      paidCommissions,
      totalPendingAmount,
      totalPaidAmount,
      level1Commissions,
      level2Commissions,
      level3Commissions
    }
  }

  const stats = getCommissionStats()

  const getLevelColor = (level: number) => {
    switch (level) {
      case 1: return 'text-green-600 bg-green-100'
      case 2: return 'text-blue-600 bg-blue-100'
      case 3: return 'text-purple-600 bg-purple-100'
      default: return 'text-gray-600 bg-gray-100'
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
          <DollarSign className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access commission management.</p>
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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Commission Management</h2>
          <p className="text-gray-600">Process commission payments and track earnings</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="card">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-primary-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Commissions</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalCommissions}</p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.pendingCommissions}</p>
                <p className="text-xs text-gray-500">{formatCurrency(stats.totalPendingAmount)}</p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Paid</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.paidCommissions}</p>
                <p className="text-xs text-gray-500">{formatCurrency(stats.totalPaidAmount)}</p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Paid</p>
                <p className="text-2xl font-semibold text-gray-900">{formatCurrency(stats.totalPaidAmount)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Level Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Level 1 Commissions</h3>
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Direct Referrals ({(rateByLevel[1] * 100).toFixed(0)}%)</p>
                <p className="text-xl font-semibold text-gray-900">{stats.level1Commissions}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Level 2 Commissions</h3>
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Second Level ({(rateByLevel[2] * 100).toFixed(0)}%)</p>
                <p className="text-xl font-semibold text-gray-900">{stats.level2Commissions}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Level 3 Commissions</h3>
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Third Level ({(rateByLevel[3] * 100).toFixed(0)}%)</p>
                <p className="text-xl font-semibold text-gray-900">{stats.level3Commissions}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters, Group Toggle and Bulk Actions */}
        <div className="card mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
            <div className="flex-1 w-full">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search commissions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <label className="inline-flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={groupByUser}
                  onChange={() => setGroupByUser(v => !v)}
                />
                <span className="text-sm text-gray-700">Group by user</span>
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'pending' | 'paid')}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
              </select>

              <select
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value as 'all' | '1' | '2' | '3')}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="all">All Levels</option>
                <option value="1">Level 1</option>
                <option value="2">Level 2</option>
                <option value="3">Level 3</option>
              </select>
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedCommissions.length > 0 && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-sm font-medium text-blue-900">
                    {selectedCommissions.length} commission{selectedCommissions.length !== 1 ? 's' : ''} selected
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <select
                    value={bulkAction}
                    onChange={(e) => setBulkAction(e.target.value as 'pay' | 'none')}
                    className="px-3 py-1 border border-blue-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="none">Select Action</option>
                    <option value="pay">Mark as Paid</option>
                  </select>
                  <button
                    onClick={handleBulkAction}
                    disabled={bulkAction === 'none'}
                    className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Apply
                  </button>
                  <button
                    onClick={() => {
                      setSelectedCommissions([])
                      setBulkAction('none')
                    }}
                    className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Commissions Table or Grouped Payables */}
        <div className="card">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-900">{groupByUser ? 'Grouped Payables' : 'Commission History'}</h3>
            <button className="btn-secondary flex items-center">
              <Download className="h-4 w-4 mr-2" />
              Export
            </button>
          </div>
          
          {groupByUser ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pending count</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pending total</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bank</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {payables.map((p) => (
                    <tr key={p.user_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <a href={`/admin/users/${p.user_id}`} className="text-sm font-medium text-primary-700 hover:text-primary-900">
                          {p.name}
                        </a>
                        <div className="text-sm text-gray-500">{p.email}</div>
                        <div className="text-xs text-gray-400">{p.ibo_number}</div>
                      </td>
                      <td className="px-6 py-4 text-sm">{p.pending_count}</td>
                      <td className="px-6 py-4 font-semibold">{formatCurrency(p.pending_total)}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {(p.bank_name || '—')} {p.bank_account_number ? `• ${p.bank_account_number}` : ''}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handlePayAllForUser(p.user_id)}
                          className="btn-primary"
                          disabled={payingUserId === p.user_id}
                        >
                          {payingUserId === p.user_id ? 'Paying…' : 'Pay All'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {payables.length === 0 && (
                <div className="text-center py-12">
                  <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No payables found</h3>
                  <p className="text-gray-600">No users with pending commissions</p>
                </div>
              )}
            </div>
          ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      checked={selectedCommissions.length === filteredCommissions.length && filteredCommissions.length > 0}
                      onChange={handleSelectAll}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Level
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCommissions.map((commission) => (
                  <tr key={commission.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedCommissions.includes(commission.id)}
                        onChange={() => handleSelectCommission(commission.id)}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{commission.user_name}</div>
                        <div className="text-sm text-gray-500">{commission.user_email}</div>
                        <div className="text-xs text-gray-400">{commission.user_ibo_number}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{commission.order_number}</div>
                        <div className="text-sm text-gray-500">{formatCurrency(commission.order_total)}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getLevelColor(commission.level)}`}>
                        Level {commission.level}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      {formatCurrency(commission.commission_amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {commission.status === 'paid' ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <Clock className="h-4 w-4 text-yellow-500" />
                        )}
                        <span className={`ml-2 text-sm font-medium ${
                          commission.status === 'paid' ? 'text-green-600' : 'text-yellow-600'
                        }`}>
                          {commission.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(commission.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleUpdateCommissionStatus(commission.id, commission.status === 'paid' ? 'pending' : 'paid')}
                          className={`text-sm px-3 py-1 rounded ${
                            commission.status === 'paid'
                              ? 'text-yellow-600 hover:text-yellow-900'
                              : 'text-green-600 hover:text-green-900'
                          }`}
                        >
                          {commission.status === 'paid' ? 'Mark Pending' : 'Mark Paid'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}

          {!groupByUser && filteredCommissions.length === 0 && (
            <div className="text-center py-12">
              <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No commissions found</h3>
              <p className="text-gray-600">Try adjusting your search or filter criteria</p>
            </div>
          )}
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
