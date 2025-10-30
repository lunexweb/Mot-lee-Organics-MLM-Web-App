'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import { 
  DollarSign, 
  TrendingUp, 
  Calendar,
  Filter,
  Download,
  Clock, 
  CheckCircle,
  AlertCircle,
  Users
} from 'lucide-react'

interface Commission {
  id: string
  commission_amount: number
  level: number
  status: 'pending' | 'paid'
  created_at: string
  order_id: string
  order_number?: string
  customer_name?: string
}

interface EarningsSummary {
  totalEarnings: number
  pendingEarnings: number
  paidEarnings: number
  level1Earnings: number
  level2Earnings: number
  level3Earnings: number
}

export default function EarningsPage() {
  const { userProfile } = useAuth()
  const [commissions, setCommissions] = useState<Commission[]>([])
  const [showRankingInfo, setShowRankingInfo] = useState(false)
  const [summary, setSummary] = useState<EarningsSummary>({
    totalEarnings: 0,
    pendingEarnings: 0,
    paidEarnings: 0,
    level1Earnings: 0,
    level2Earnings: 0,
    level3Earnings: 0,
  })
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'paid'>('all')
  const [levelFilter, setLevelFilter] = useState<'all' | '1' | '2' | '3'>('all')

  useEffect(() => {
    if (userProfile) {
      fetchEarnings()
    }
  }, [userProfile])

  const fetchEarnings = async () => {
    if (!userProfile) return
    
    try {
      // Get all commissions for the user
      const { data: commissionsData, error } = await supabase
        .from('commissions')
        .select(`
          id,
          commission_amount,
          level,
          status,
          created_at,
          order_id,
          orders(
            order_number,
            users(name)
          )
        `)
        .eq('user_id', userProfile.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching commissions:', error)
        setCommissions([])
        setLoading(false)
        return
      }

      // If no commissions, show empty state immediately
      if (!commissionsData || commissionsData.length === 0) {
        setCommissions([])
        setSummary({
          totalEarnings: 0,
          pendingEarnings: 0,
          paidEarnings: 0,
          level1Earnings: 0,
          level2Earnings: 0,
          level3Earnings: 0,
        })
        setLoading(false)
        return
      }

      // Transform the data
      const transformedCommissions = commissionsData.map((commission: any) => ({
        id: commission.id,
        commission_amount: commission.commission_amount,
        level: commission.level,
        status: commission.status,
        created_at: commission.created_at,
        order_id: commission.order_id,
        order_number: commission.orders?.order_number,
        customer_name: commission.orders?.users?.name,
      }))

      setCommissions(transformedCommissions)

      // Calculate summary
      const summaryData = transformedCommissions.reduce((acc, commission) => {
        acc.totalEarnings += commission.commission_amount
        
        if (commission.status === 'pending') {
          acc.pendingEarnings += commission.commission_amount
      } else {
          acc.paidEarnings += commission.commission_amount
        }

        if (commission.level === 1) {
          acc.level1Earnings += commission.commission_amount
        } else if (commission.level === 2) {
          acc.level2Earnings += commission.commission_amount
        } else if (commission.level === 3) {
          acc.level3Earnings += commission.commission_amount
        }

        return acc
      }, {
        totalEarnings: 0,
        pendingEarnings: 0,
        paidEarnings: 0,
        level1Earnings: 0,
        level2Earnings: 0,
        level3Earnings: 0,
      })

      setSummary(summaryData)
    } catch (error) {
      console.error('Error fetching earnings:', error)
      setCommissions([])
    } finally {
      setLoading(false)
    }
  }

  const filteredCommissions = commissions.filter(commission => {
    const statusMatch = statusFilter === 'all' || commission.status === statusFilter
    const levelMatch = levelFilter === 'all' || commission.level.toString() === levelFilter
    return statusMatch && levelMatch
  })

  const getLevelColor = (level: number) => {
    switch (level) {
      case 1: return 'text-green-600 bg-green-100'
      case 2: return 'text-blue-600 bg-blue-100'
      case 3: return 'text-purple-600 bg-purple-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
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
                  href="/dashboard"
                  className="text-gray-600 hover:text-gray-900"
                >
                  Dashboard
                </a>
              </div>
            </div>
          </div>
        </header>

        {/* Loading Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Earnings & Commissions</h2>
            <p className="text-gray-600">Loading your earnings data...</p>
          </div>
          
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading commission information...</p>
            </div>
          </div>
        </main>
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
                href="/dashboard"
                className="text-gray-600 hover:text-gray-900"
              >
                Dashboard
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Earnings & Commissions</h2>
          <p className="text-gray-600">Track your commission earnings and payment status</p>
        </div>

        {/* Ranking & Levels Info */}
        <div className="card mb-8">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Ranking and Levels</h3>
              <p className="text-sm text-gray-600 mt-1">Understand how commissions are earned across your team.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowRankingInfo(v => !v)}
              className="btn-secondary"
            >
              {showRankingInfo ? 'Hide details' : 'How it works'}
            </button>
          </div>

          {showRankingInfo && (
            <div className="mt-4 space-y-3 text-sm text-gray-700">
              <div>
                <p className="font-medium text-gray-900 mb-1">Levels</p>
                <ul className="list-disc ml-5 space-y-1">
                  <li><span className="font-medium">Level 1</span>: Your direct referrals. You earn 10% on their eligible orders.</li>
                  <li><span className="font-medium">Level 2</span>: Your referral’s referrals. You earn 5% on their eligible orders.</li>
                  <li><span className="font-medium">Level 3</span>: Third line referrals. You earn 2% on their eligible orders.</li>
                </ul>
              </div>
              <div>
                <p className="font-medium text-gray-900 mb-1">When earnings are created</p>
                <p>Commissions are generated after we receive payment.</p>
              </div>
              <div>
                <p className="font-medium text-gray-900 mb-1">How to rank up</p>
                <ul className="list-disc ml-5 space-y-1">
                  <li>Invite new members using your referral link to grow your Level 1.</li>
                  <li>Support your team to help them recruit, unlocking Level 2 and Level 3 earnings.</li>
                  <li>Keep your profile complete and status active to receive payouts.</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="card">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Earnings</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {formatCurrency(summary.totalEarnings)}
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircle className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Paid Earnings</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {formatCurrency(summary.paidEarnings)}
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="h-8 w-8 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending Earnings</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {formatCurrency(summary.pendingEarnings)}
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Commissions</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {commissions.length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Level Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Level 1 Earnings</h3>
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Direct Referrals (10%)</p>
                <p className="text-xl font-semibold text-gray-900">
                  {formatCurrency(summary.level1Earnings)}
              </p>
            </div>
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Level 2 Earnings</h3>
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Second Level (5%)</p>
                <p className="text-xl font-semibold text-gray-900">
                  {formatCurrency(summary.level2Earnings)}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Level 3 Earnings</h3>
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Third Level (2%)</p>
                <p className="text-xl font-semibold text-gray-900">
                  {formatCurrency(summary.level3Earnings)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="card mb-6">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Filter className="h-5 w-5 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">Filter by:</span>
            </div>
            
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

        {/* Commissions Table */}
        <div className="card">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Commission History</h3>
            <button className="btn-secondary flex items-center">
              <Download className="h-4 w-4 mr-2" />
              Export
            </button>
          </div>
          
          {filteredCommissions.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {commissions.length === 0 ? 'No commissions earned yet' : 'No commissions match your filters'}
              </h3>
              <p className="text-gray-600 mb-6">
                {commissions.length === 0 
                  ? 'You haven\'t earned any commissions yet. Start building your team and making sales to earn commissions on your downline\'s orders!'
                  : 'Try adjusting your filters to see more commission records.'
                }
              </p>
              {commissions.length === 0 && (
                <div className="space-y-4">
                  <a
                    href="/team"
                    className="btn-primary inline-flex items-center"
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Build Your Team
                  </a>
                  <p className="text-sm text-gray-500">
                    Recruit team members to start earning commissions
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Order
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
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
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredCommissions.map((commission) => (
                      <tr key={commission.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {commission.order_number || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {commission.customer_name || 'N/A'}
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
                          {getStatusIcon(commission.status)}
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
                      </tr>
                  ))}
                </tbody>
              </table>
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
