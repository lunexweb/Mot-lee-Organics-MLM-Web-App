'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import { 
  Users, 
  ShoppingCart, 
  DollarSign, 
  TrendingUp,
  Package,
  LogOut
} from 'lucide-react'

export default function DashboardPage() {
  const { user, userProfile, signOut, loading } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState({
    personalSales: 0,
    teamSales: 0,
    totalEarnings: 0,
    downlineCount: 0,
  })
  const [statsLoading, setStatsLoading] = useState(true)
  const [referralLink, setReferralLink] = useState('')
  const [recentOrders, setRecentOrders] = useState<any[]>([])

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
        downlineCountRes,
        commissionsRes,
        downlineIdsRes
      ] = await Promise.all([
        supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userProfile.id),
        supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('sponsor_id', userProfile.id),
        supabase
          .from('commissions')
          .select('commission_amount')
          .eq('user_id', userProfile.id)
          .eq('status', 'paid'),
        supabase
          .from('users')
          .select('id')
          .eq('sponsor_id', userProfile.id)
      ])

      const personalSales = personalSalesRes.count || 0
      const downlineCount = downlineCountRes.count || 0
      const commissions = commissionsRes.data || []
      const downlineIds = (downlineIdsRes.data || []).map(u => u.id)

      const totalEarnings = commissions.reduce((sum, c) => sum + c.commission_amount, 0)

      // Team sales depends on downline IDs - fetch after we have them
      let teamSales = 0
      if (downlineIds.length > 0) {
        const teamRes = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .in('user_id', downlineIds)
        teamSales = teamRes.count || 0
      }

      setStats({
        personalSales,
        teamSales,
        totalEarnings,
        downlineCount,
      })
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
    } finally {
      setStatsLoading(false)
    }
  }

  const fetchRecentOrders = async () => {
    if (!userProfile) return
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', userProfile.id)
      .order('created_at', { ascending: false })
      .limit(5)
    if (!error) setRecentOrders(data || [])
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
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 gap-2">
            <div className="flex items-center min-w-0">
              <div className="flex-shrink-0">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center mr-0 sm:mr-3">
                    <span className="text-white font-bold text-sm">ML</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4 flex-shrink-0">
              <span className="text-sm text-gray-600 hidden sm:inline truncate max-w-[40vw]">
                Welcome, {userProfile?.name}
              </span>
              <button
                onClick={handleSignOut}
                className="flex items-center text-gray-600 hover:text-gray-900"
              >
                <LogOut className="h-5 w-5 mr-1" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome back, {userProfile?.name}!
          </h2>
          <p className="text-gray-600">
            Your IBO Number: <span className="font-semibold text-primary-600">{userProfile?.ibo_number}</span>
          </p>
        </div>

        {/* Profile completion banner */}
        {(userProfile && (
          !userProfile.bank_account_number ||
          !userProfile.address_line1 ||
          !userProfile.id_number
        )) && (
          <div className="mb-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              Your profile is incomplete. Please add your address, bank details, and ID number to receive commissions.
              <a href="/profile" className="ml-2 text-yellow-900 underline font-medium">Complete your profile</a>
            </p>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="card">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ShoppingCart className="h-8 w-8 text-primary-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Personal Sales</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {stats.personalSales}
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-8 w-8 text-accent-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Team Members</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {stats.downlineCount}
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Team Sales</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {stats.teamSales}
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DollarSign className="h-8 w-8 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Earnings</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {formatCurrency(stats.totalEarnings)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Referral Link & Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="card lg:col-span-2">
            <div className="flex items-center justify-between min-w-0">
              <div className="min-w-0">
                <h3 className="text-lg font-semibold text-gray-900">Your referral link</h3>
                <p className="text-gray-600 text-sm">Share this link to register people under you.</p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-3 min-w-0">
              <input readOnly className="input-field flex-1 min-w-0 truncate" value={referralLink} title={referralLink} />
              <button
                className="btn-secondary"
                onClick={() => {
                  try { navigator.clipboard.writeText(referralLink) } catch {}
                }}
              >Copy</button>
            </div>
          </div>
          <a
            href="/products"
            className="card hover:shadow-md transition-shadow duration-200 cursor-pointer"
          >
            <div className="flex items-center">
              <Package className="h-8 w-8 text-primary-600 mr-4" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Browse Products</h3>
                <p className="text-gray-600">View our premium organic skincare products</p>
              </div>
            </div>
          </a>

          <a
            href="/team"
            className="card hover:shadow-md transition-shadow duration-200 cursor-pointer"
          >
            <div className="flex items-center">
              <Users className="h-8 w-8 text-accent-600 mr-4" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">View Team</h3>
                <p className="text-gray-600">Manage your downline and referrals</p>
              </div>
            </div>
          </a>

          <a
            href="/earnings"
            className="card hover:shadow-md transition-shadow duration-200 cursor-pointer"
          >
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-green-600 mr-4" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">View Earnings</h3>
                <p className="text-gray-600">Track your commissions and payments</p>
              </div>
            </div>
          </a>

          <a
            href="/orders"
            className="card hover:shadow-md transition-shadow duration-200 cursor-pointer"
          >
            <div className="flex items-center">
              <ShoppingCart className="h-8 w-8 text-purple-600 mr-4" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Order History</h3>
                <p className="text-gray-600">View your past orders and status</p>
              </div>
            </div>
          </a>
        </div>

        {/* Recent Orders */}
        <div className="mt-8">
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent orders</h3>
            {recentOrders.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">No orders yet</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {recentOrders.map((o) => (
                  <a key={o.id} href={`/orders/${o.id}`} className="flex items-center justify-between py-3 hover:bg-gray-50 rounded px-2">
                    <div>
                      <div className="text-sm font-medium text-gray-900">Order #{o.order_number}</div>
                      <div className="text-xs text-gray-600">{new Date(o.created_at).toLocaleString()}</div>
                    </div>
                    <div className="text-sm font-semibold">{formatCurrency(o.total_amount)}</div>
                  </a>
                ))}
              </div>
            )}
          </div>
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
