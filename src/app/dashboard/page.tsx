'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import { 
  Users, 
  ShoppingCart, 
  DollarSign, 
  TrendingUp,
  Package,
  LogOut,
  Award,
  Target,
  Wallet,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  Receipt,
  Store,
  Trophy,
  RefreshCw,
  Eye,
  Coins
} from 'lucide-react'

export default function DashboardPage() {
  const { user, userProfile, signOut, loading } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState({
    personalSales: 0,
    teamSales: 0,
    totalEarnings: 0,
    pendingEarnings: 0,
    downlineCount: 0,
  })
  const [statsLoading, setStatsLoading] = useState(true)
  const [referralLink, setReferralLink] = useState('')
  const [recentOrders, setRecentOrders] = useState<any[]>([])
  const [currentRank, setCurrentRank] = useState<any>(null)
  const [nextRank, setNextRank] = useState<any>(null)
  const [rankProgress, setRankProgress] = useState({
    teamSalesProgress: 0,
    personalSalesProgress: 0,
    membersProgress: 0
  })
  const [walletData, setWalletData] = useState({
    eWalletBalance: 0,
    paymentWalletBalance: 0,
    availableForWithdrawal: 0
  })
  const [incomeBreakdown, setIncomeBreakdown] = useState({
    referralIncome: 0,
    repurchaseIncome: 0,
    maintenanceIncome: 0,
    totalIncome: 0
  })
  const [businessValue, setBusinessValue] = useState({
    total: 0,
    levels: [0, 0, 0]
  })
  const [recentTransactions, setRecentTransactions] = useState<any[]>([])

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (userProfile) {
      // Redirect admins to admin panel (same behavior as before login optimization)
      if (userProfile.role === 'admin') {
        router.push('/admin')
        return
      }
      
      fetchDashboardStats()
      fetchRecentOrders()
      fetchRankInfo()
      fetchWalletData()
      fetchIncomeBreakdown()
      fetchBusinessValue()
      fetchRecentTransactions()
      try {
        const origin = window?.location?.origin || ''
        // Generate sponsor URL: name-IBO_number format (always use IBO number for compatibility)
        const nameSlug = userProfile.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
        const iboNum = userProfile.ibo_number
        setReferralLink(`${origin}/signup?sponsor=${nameSlug}-${iboNum}`)
      } catch {}
    }
  }, [userProfile, router])

  const fetchDashboardStats = async () => {
    if (!userProfile) return
    
    try {
      // Run independent queries in parallel for better performance
      const [
        personalSalesRes,
        paidCommissionsRes,
        pendingCommissionsRes
      ] = await Promise.all([
        supabase
          .from('orders')
          .select('total_amount')
          .eq('user_id', userProfile.id),
        supabase
          .from('commissions')
          .select('commission_amount')
          .eq('user_id', userProfile.id)
          .eq('status', 'paid'),
        supabase
          .from('commissions')
          .select('commission_amount')
          .eq('user_id', userProfile.id)
          .eq('status', 'pending')
      ])

      const personalSales = (personalSalesRes.data || []).reduce((sum, order) => sum + (order.total_amount || 0), 0)
      const paidCommissions = paidCommissionsRes.data || []
      const pendingCommissions = pendingCommissionsRes.data || []

      const totalEarnings = paidCommissions.reduce((sum, c) => sum + c.commission_amount, 0)
      const pendingEarnings = pendingCommissions.reduce((sum, c) => sum + c.commission_amount, 0)

      // Build full recursive downline (all levels, not just direct)
      const allUsersRes = await supabase.from('users').select('id, sponsor_id')
      const allUsers = allUsersRes.data || []

      const allDownlineIds = new Set<string>()
      const collectDownline = (nodeId: string) => {
        allUsers
          .filter(u => u.sponsor_id === nodeId)
          .forEach(child => {
            allDownlineIds.add(child.id)
            collectDownline(child.id)
          })
      }
      collectDownline(userProfile.id)

      const downlineCount = allDownlineIds.size

      // Team sales: revenue from ALL downline levels
      let teamSales = 0
      if (allDownlineIds.size > 0) {
        const teamRes = await supabase
          .from('orders')
          .select('total_amount')
          .in('user_id', Array.from(allDownlineIds))
        teamSales = (teamRes.data || []).reduce((sum, order) => sum + order.total_amount, 0)
      }

      setStats({
        personalSales,
        teamSales,
        totalEarnings,
        pendingEarnings,
        downlineCount,
      })
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
    } finally {
      setStatsLoading(false)
    }
  }

  const fetchWalletData = async () => {
    if (!userProfile) return
    
    try {
      const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', userProfile.id)
      
      if (!error && data) {
        const eWallet = data.find(w => w.wallet_type === 'e_wallet')
        const paymentWallet = data.find(w => w.wallet_type === 'payment_wallet')
        
        setWalletData({
          eWalletBalance: eWallet?.balance || 0,
          paymentWalletBalance: paymentWallet?.balance || 0,
          availableForWithdrawal: eWallet?.available_for_withdrawal || 0
        })
      }
    } catch (error) {
      console.error('Error fetching wallet data:', error)
    }
  }

  const fetchIncomeBreakdown = async () => {
    if (!userProfile) return
    
    try {
      const { data, error } = await supabase
        .from('income_breakdown')
        .select('*')
        .eq('user_id', userProfile.id)
        .single()
      
      if (!error && data) {
        setIncomeBreakdown({
          referralIncome: data.referral_income || 0,
          repurchaseIncome: data.repurchase_income || 0,
          maintenanceIncome: data.maintenance_income || 0,
          totalIncome: data.total_income || 0
        })
      }
    } catch (error) {
      console.error('Error fetching income breakdown:', error)
    }
  }

  const fetchBusinessValue = async () => {
    if (!userProfile) return
    
    try {
      const { data, error } = await supabase
        .from('business_value')
        .select('level, total_bv')
        .eq('user_id', userProfile.id)
        .order('level', { ascending: true })
      
      if (!error && data) {
        const levels = [0, 0, 0]
        let total = 0
        
        data.forEach(bv => {
          total += bv.total_bv
          if (bv.level <= 3) {
            levels[bv.level - 1] = bv.total_bv
          }
        })
        
        setBusinessValue({ total, levels })
      }
    } catch (error) {
      console.error('Error fetching business value:', error)
    }
  }

  const fetchRecentTransactions = async () => {
    if (!userProfile) return
    
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userProfile.id)
        .order('created_at', { ascending: false })
        .limit(10)
      
      if (!error) {
        setRecentTransactions(data || [])
      }
    } catch (error) {
      console.error('Error fetching recent transactions:', error)
    }
  }

  // Refetch rank info when stats change
  useEffect(() => {
    if (userProfile && !statsLoading) {
      fetchRankInfo()
    }
  }, [stats, userProfile, statsLoading])

  const fetchRecentOrders = async () => {
    if (!userProfile) return
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', userProfile.id)
      .order('created_at', { ascending: false })
      .limit(5)
    if (!error) {
      const readyOrders = (data || []).filter((order) => {
        const status = String(order.status || '').toLowerCase()
        return status === 'shipped' || status.includes('pickup') || status.includes('ready')
      })
      setRecentOrders(readyOrders)
    }
  }

  const fetchRankInfo = async () => {
    if (!userProfile) return
    
    try {
      // Get all ranks ordered by level
      const { data: ranks, error: ranksError } = await supabase
        .from('ranks')
        .select('*')
        .eq('is_active', true)
        .order('level_order', { ascending: true })

      if (ranksError) throw ranksError

      if (!ranks || ranks.length === 0) return

      // Find current rank based on user's performance
      let userRank = ranks[0] // Default to first rank
      let nextRankData = ranks[1] || null

      // Simple rank calculation based on team sales (you can make this more sophisticated)
      for (let i = ranks.length - 1; i >= 0; i--) {
        const rank = ranks[i]
        // This is a simplified calculation - you might want to add more sophisticated logic
        const teamSales = stats.teamSales
        const personalSales = stats.personalSales
        const downlineCount = stats.downlineCount

        if (
          teamSales >= rank.team_sales_target &&
          personalSales >= rank.personal_sales_target &&
          downlineCount >= rank.min_active_members
        ) {
          userRank = rank
          nextRankData = ranks[i + 1] || null
          break
        }
      }

      setCurrentRank(userRank)
      setNextRank(nextRankData)

      // Calculate progress toward next rank
      if (nextRankData) {
        const teamProgress = Math.min((stats.teamSales / nextRankData.team_sales_target) * 100, 100)
        const personalProgress = nextRankData.personal_sales_target > 0 
          ? Math.min((stats.personalSales / nextRankData.personal_sales_target) * 100, 100)
          : 100
        const membersProgress = nextRankData.min_active_members > 0
          ? Math.min((stats.downlineCount / nextRankData.min_active_members) * 100, 100)
          : 100

        setRankProgress({
          teamSalesProgress: teamProgress,
          personalSalesProgress: personalProgress,
          membersProgress: membersProgress
        })
      }
    } catch (error) {
      console.error('Error fetching rank info:', error)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    router.replace('/login')
  }

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  // Redirect if not authenticated
  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 gap-3">
            <div className="flex items-center min-w-0">
              <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                <span className="text-white font-bold text-sm">ML</span>
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-400 leading-none">Member Portal</p>
                <h1 className="text-base font-semibold text-gray-900 leading-tight">Dashboard</h1>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-sm text-gray-600 hidden sm:inline max-w-[20vw] truncate">{userProfile?.name}</span>
              <button
                onClick={handleSignOut}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-4">

        {/* Welcome Banner */}
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 truncate">Welcome back, {userProfile?.name}!</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              IBO: <span className="font-semibold text-primary-600">{userProfile?.ibo_number}</span>
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Link href="/orders" className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">Orders</Link>
            <Link href="/profile" className="px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">Profile</Link>
          </div>
        </div>

        {/* Profile incomplete banner */}
        {(userProfile && (!userProfile.bank_account_number || !userProfile.address_line1 || !userProfile.id_number)) && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3">
            <p className="text-sm text-yellow-800">
              ⚠️ Profile incomplete.{' '}
              <Link href="/profile" className="text-yellow-900 underline font-medium">Add address, bank details & ID to receive commissions →</Link>
            </p>
          </div>
        )}

        {/* Key Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl border border-gray-200 p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
              <ShoppingCart className="h-4 w-4 text-primary-600" />
            </div>
            <div className="min-w-0">
              <div className="text-xs text-gray-500">Personal Sales</div>
              <div className="text-sm font-bold text-gray-900 truncate">{statsLoading ? '—' : formatCurrency(stats.personalSales)}</div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
              <Users className="h-4 w-4 text-accent-600" />
            </div>
            <div className="min-w-0">
              <div className="text-xs text-gray-500">Team Size</div>
              <div className="text-sm font-bold text-gray-900 truncate">{statsLoading ? '—' : stats.downlineCount}</div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="h-4 w-4 text-green-600" />
            </div>
            <div className="min-w-0">
              <div className="text-xs text-gray-500">Team Sales</div>
              <div className="text-sm font-bold text-gray-900 truncate">{statsLoading ? '—' : formatCurrency(stats.teamSales)}</div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-yellow-50 flex items-center justify-center flex-shrink-0">
              <DollarSign className="h-4 w-4 text-yellow-600" />
            </div>
            <div className="min-w-0">
              <div className="text-xs text-gray-500">Earnings</div>
              <div className="text-sm font-bold text-gray-900 truncate">{statsLoading ? '—' : formatCurrency(stats.totalEarnings)}</div>
              {stats.pendingEarnings > 0 && <div className="text-xs text-orange-500 truncate">+{formatCurrency(stats.pendingEarnings)} pending</div>}
            </div>
          </div>
        </div>

        {/* Income Breakdown + Wallets */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Income Breakdown */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Income Breakdown</h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-100 overflow-hidden">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-500">Referral</span>
                  <span className="flex items-center text-green-600 text-xs"><ArrowUpRight className="h-3 w-3" />24%</span>
                </div>
                <div className="text-sm font-bold text-gray-900 truncate">{formatCurrency(incomeBreakdown.referralIncome)}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-100 overflow-hidden">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-500">Repurchase</span>
                  <span className="flex items-center text-green-600 text-xs"><ArrowUpRight className="h-3 w-3" />14%</span>
                </div>
                <div className="text-sm font-bold text-gray-900 truncate">{formatCurrency(incomeBreakdown.repurchaseIncome)}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-100 overflow-hidden">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-500">Maintenance</span>
                  <span className="flex items-center text-red-500 text-xs"><ArrowDownRight className="h-3 w-3" />35%</span>
                </div>
                <div className="text-sm font-bold text-gray-900 truncate">{formatCurrency(incomeBreakdown.maintenanceIncome)}</div>
              </div>
              <div className="bg-primary-50 rounded-lg p-3 border border-primary-100 overflow-hidden">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-primary-700 font-medium">Total</span>
                  <span className="flex items-center text-green-600 text-xs"><ArrowUpRight className="h-3 w-3" />18%</span>
                </div>
                <div className="text-sm font-bold text-primary-700 truncate">{formatCurrency(incomeBreakdown.totalIncome)}</div>
              </div>
            </div>
          </div>

          {/* Wallets */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col gap-3">
            <h3 className="text-sm font-semibold text-gray-900">Wallets</h3>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-primary-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Wallet className="h-4 w-4 text-primary-600" />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">E-Wallet</div>
                  <div className="text-xs text-gray-500">Withdrawal: {formatCurrency(walletData.availableForWithdrawal)}</div>
                </div>
              </div>
              <div className="text-lg font-bold text-gray-900">{formatCurrency(walletData.eWalletBalance)}</div>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-primary-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <CreditCard className="h-4 w-4 text-primary-600" />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">Payment Wallet</div>
                  <div className="text-xs text-gray-500">For online shopping</div>
                </div>
              </div>
              <div className="text-lg font-bold text-gray-900">{formatCurrency(walletData.paymentWalletBalance)}</div>
            </div>
          </div>
        </div>

        {/* Business Value */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900">Business Value</h3>
            <span className="text-base font-bold text-primary-600">{businessValue.total} BV</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'L1', value: businessValue.levels[0], color: 'bg-primary-600' },
              { label: 'L2', value: businessValue.levels[1], color: 'bg-accent-600' },
              { label: 'L3', value: businessValue.levels[2], color: 'bg-green-600' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-gray-50 rounded-xl border border-gray-100 p-3 overflow-hidden">
                <div className="text-xs text-gray-500 mb-1">{label}</div>
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${color}`} />
                  <span className="text-sm font-bold text-gray-900 truncate">{value}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Rank Progress */}
        {currentRank && (
          <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl p-5 text-white">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="text-xs text-primary-200 uppercase tracking-wider mb-0.5">Current Rank</div>
                <h3 className="text-xl font-bold">{currentRank.name}</h3>
                <p className="text-primary-200 text-sm">Level {currentRank.level_order}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                <Award className="h-5 w-5 text-white" />
              </div>
            </div>
            {nextRank && (
              <div className="space-y-2.5 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-primary-100">Progress to {nextRank.name}</span>
                  <span className="text-sm font-semibold">
                    {Math.round((rankProgress.teamSalesProgress + rankProgress.personalSalesProgress + rankProgress.membersProgress) / 3)}%
                  </span>
                </div>
                {nextRank.team_sales_target > 0 && (
                  <div>
                    <div className="flex justify-between text-xs text-primary-200 mb-1">
                      <span>Team Sales</span>
                      <span>{formatCurrency(stats.teamSales)} / {formatCurrency(nextRank.team_sales_target)}</span>
                    </div>
                    <div className="w-full bg-primary-800 rounded-full h-1.5">
                      <div className="bg-white h-1.5 rounded-full transition-all duration-300" style={{ width: `${rankProgress.teamSalesProgress}%` }} />
                    </div>
                  </div>
                )}
                {nextRank.personal_sales_target > 0 && (
                  <div>
                    <div className="flex justify-between text-xs text-primary-200 mb-1">
                      <span>Personal Sales</span>
                      <span>{formatCurrency(stats.personalSales)} / {formatCurrency(nextRank.personal_sales_target)}</span>
                    </div>
                    <div className="w-full bg-primary-800 rounded-full h-1.5">
                      <div className="bg-white h-1.5 rounded-full transition-all duration-300" style={{ width: `${rankProgress.personalSalesProgress}%` }} />
                    </div>
                  </div>
                )}
                {nextRank.min_active_members > 0 && (
                  <div>
                    <div className="flex justify-between text-xs text-primary-200 mb-1">
                      <span>Active Members</span>
                      <span>{stats.downlineCount} / {nextRank.min_active_members}</span>
                    </div>
                    <div className="w-full bg-primary-800 rounded-full h-1.5">
                      <div className="bg-white h-1.5 rounded-full transition-all duration-300" style={{ width: `${rankProgress.membersProgress}%` }} />
                    </div>
                  </div>
                )}
              </div>
            )}
            <div className="flex items-center justify-between pt-3 border-t border-primary-500">
              <div className="space-y-0.5">
                {nextRank?.rank_bonus > 0 && (
                  <p className="text-xs text-primary-200">Next Bonus: <span className="font-semibold text-white">{formatCurrency(nextRank.rank_bonus)}</span></p>
                )}
                {currentRank.salary > 0 && (
                  <p className="text-xs text-primary-200">Monthly Salary: <span className="font-semibold text-white">{formatCurrency(currentRank.salary)}</span></p>
                )}
              </div>
              <Link href="/ranks" className="text-sm font-medium text-white hover:text-primary-200 transition-colors">View Ranks →</Link>
            </div>
          </div>
        )}

        {/* Orders Ready */}
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <Store className="h-4 w-4 text-primary-600" />
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-900">Ready for Pickup / Shipped</div>
              <div className="text-xs text-gray-500">Orders awaiting collection or in transit</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold text-primary-600">{recentOrders.length}</span>
            <Link href="/orders" className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">View</Link>
          </div>
        </div>

        {/* Referral Link */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="mb-2">
            <h3 className="text-sm font-semibold text-gray-900">Your Referral Link</h3>
            <p className="text-xs text-gray-500">Share to grow your team</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              readOnly
              className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 text-gray-700 min-w-0 truncate"
              value={referralLink}
              title={referralLink}
            />
            <button
              className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex-shrink-0"
              onClick={() => { try { navigator.clipboard.writeText(referralLink) } catch {} }}
            >
              Copy
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Quick Actions</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {([
              { href: '/products', Icon: Package, bg: 'bg-primary-50', iconClass: 'text-primary-600', title: 'Products', desc: 'Browse skincare' },
              { href: '/genealogy', Icon: Users, bg: 'bg-blue-50', iconClass: 'text-accent-600', title: 'Genealogy', desc: 'Downline tree' },
              { href: '/team', Icon: Target, bg: 'bg-blue-50', iconClass: 'text-accent-600', title: 'My Team', desc: 'Direct referrals' },
              { href: '/earnings', Icon: DollarSign, bg: 'bg-green-50', iconClass: 'text-green-600', title: 'Earnings', desc: 'Commission history' },
            ] as const).map(({ href, Icon, bg, iconClass, title, desc }) => (
              <Link key={href} href={href} className="bg-white rounded-xl border border-gray-200 p-3 hover:shadow-md hover:border-gray-300 transition-all flex flex-col gap-2">
                <div className={`w-9 h-9 ${bg} rounded-xl flex items-center justify-center`}>
                  <Icon className={`h-4 w-4 ${iconClass}`} />
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-900">{title}</div>
                  <div className="text-xs text-gray-500">{desc}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">Recent Transactions</h3>
          </div>
          {recentTransactions.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">No transactions yet</div>
          ) : (
            <div>
              {recentTransactions.slice(0, 5).map((t) => (
                <div key={t.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${t.transaction_type === 'credit' ? 'bg-green-100' : 'bg-red-100'}`}>
                    {t.transaction_type === 'credit'
                      ? <ArrowUpRight className="h-4 w-4 text-green-600" />
                      : <ArrowDownRight className="h-4 w-4 text-red-600" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{t.source_name || t.source_type}</div>
                    <div className="text-xs text-gray-500 truncate">{t.description || 'Transaction'}</div>
                  </div>
                  <div className={`text-sm font-bold flex-shrink-0 ${t.transaction_type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                    {t.transaction_type === 'credit' ? '+' : '-'}{formatCurrency(t.amount)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Orders */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">Recent Orders</h3>
          </div>
          {recentOrders.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">No orders yet</div>
          ) : (
            <div>
              {recentOrders.map((o) => (
                <Link key={o.id} href={`/orders/${o.id}`} className="flex items-center justify-between px-4 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                  <div>
                    <div className="text-sm font-medium text-gray-900">Order #{o.order_number}</div>
                    <div className="text-xs text-gray-500">{new Date(o.created_at).toLocaleDateString()}</div>
                  </div>
                  <div className="text-sm font-bold text-gray-900">{formatCurrency(o.total_amount)}</div>
                </Link>
              ))}
            </div>
          )}
        </div>

      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 text-center">
          <p className="text-xs text-gray-400">
            Built by{' '}
            <a href="https://www.lunexweb.com" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:text-primary-700 font-medium">lunexweb</a>
          </p>
        </div>
      </footer>
    </div>
  )
}
