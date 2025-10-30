'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AlertModal } from '@/components/Modal'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import { 
  Users, 
  ShoppingCart, 
  DollarSign, 
  TrendingUp,
  Package,
  UserCheck,
  AlertCircle,
  Activity,
  BarChart3,
  Settings,
  LogOut
} from 'lucide-react'

interface AdminStats {
  totalUsers: number
  activeUsers: number
  totalOrders: number
  totalRevenue: number
  pendingCommissions: number
  totalCommissions: number
  recentOrders: any[]
  topPerformers: any[]
}

export default function AdminDashboard() {
  const { user, userProfile, loading: authLoading, signOut } = useAuth()
  const router = useRouter()
  const [copyModalOpen, setCopyModalOpen] = useState(false)
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalOrders: 0,
    totalRevenue: 0,
    pendingCommissions: 0,
    totalCommissions: 0,
    recentOrders: [],
    topPerformers: []
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (userProfile?.role === 'admin') {
      fetchAdminStats()
    }
  }, [userProfile])

  const fetchAdminStats = async () => {
    try {
      // Run all independent queries in parallel for maximum performance
      const [
        totalUsersRes,
        activeUsersRes,
        totalOrdersRes,
        ordersRes,
        totalCommissionsRes,
        pendingCommissionsRes,
        recentOrdersRes,
        topPerformersRes
      ] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('orders').select('*', { count: 'exact', head: true }),
        supabase.from('orders').select('total_amount').in('status', ['processing','shipped','delivered']),
        supabase.from('commissions').select('*', { count: 'exact', head: true }),
        supabase.from('commissions').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase
          .from('orders')
          .select(`
            id,
            order_number,
            total_amount,
            status,
            created_at,
            users!inner(name, email)
          `)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('users')
          .select(`
            id,
            name,
            email,
            ibo_number,
            orders!inner(total_amount)
          `)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(5)
      ])

      const totalRevenue = ordersRes.data?.reduce((sum, order) => sum + order.total_amount, 0) || 0

      setStats({
        totalUsers: totalUsersRes.count || 0,
        activeUsers: activeUsersRes.count || 0,
        totalOrders: totalOrdersRes.count || 0,
        totalRevenue,
        pendingCommissions: pendingCommissionsRes.count || 0,
        totalCommissions: totalCommissionsRes.count || 0,
        recentOrders: recentOrdersRes.data || [],
        topPerformers: topPerformersRes.data || []
      })
    } catch (error) {
      console.error('Error fetching admin stats:', error)
    } finally {
      setLoading(false)
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
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access the admin panel.</p>
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
                onClick={async () => {
                  await signOut()
                  router.replace('/login')
                }}
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
        {/* Page Header */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">✨ Hello Beauty! ✨</h2>
          <p className="text-gray-600">Your platform overview</p>
        </div>

        {/* Admin Referral Link Card */}
        {userProfile && (
          <div className="card bg-gradient-to-r from-primary-50 to-accent-50 border-primary-200 mb-8">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Your Referral Link</h3>
                <p className="text-sm text-gray-600 mb-3">Share this link for people to sign up under you</p>
                <div className="flex items-center gap-2 bg-white p-3 rounded-lg border border-gray-200 min-w-0">
                  <code className="text-sm text-gray-800 flex-1 min-w-0 truncate" title={typeof window !== 'undefined' 
                      ? `${window.location.origin}/signup?sponsor=${userProfile.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')}-${userProfile.admin_number || userProfile.ibo_number}`
                      : 'Loading...'}>
                    {typeof window !== 'undefined' 
                      ? `${window.location.origin}/signup?sponsor=${userProfile.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')}-${userProfile.admin_number || userProfile.ibo_number}`
                      : 'Loading...'}
                  </code>
                  <button
                    onClick={async () => {
                      const link = typeof window !== 'undefined' 
                        ? `${window.location.origin}/signup?sponsor=${userProfile.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')}-${userProfile.admin_number || userProfile.ibo_number}`
                        : ''
                      try {
                        await navigator.clipboard.writeText(link)
                        setCopyModalOpen(true)
                        setTimeout(() => setCopyModalOpen(false), 1200)
                      } catch (err) {
                        console.error('Failed to copy:', err)
                      }
                    }}
                    className="btn-primary text-sm px-4 py-2 whitespace-nowrap"
                  >
                    Copy
                  </button>
                </div>
                {userProfile.admin_number && (
                  <p className="text-xs text-gray-500 mt-2">
                    Admin Number: <strong>{userProfile.admin_number}</strong>
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        <AlertModal open={copyModalOpen} title="Copied" message="Link copied!" onClose={() => setCopyModalOpen(false)} />

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="card">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-8 w-8 text-primary-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {stats.totalUsers}
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UserCheck className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Users</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {stats.activeUsers}
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ShoppingCart className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Orders</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {stats.totalOrders}
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
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {formatCurrency(stats.totalRevenue)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Commission Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="card">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Activity className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Commissions</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {stats.totalCommissions}
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <AlertCircle className="h-8 w-8 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending Commissions</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {stats.pendingCommissions}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <a
            href="/admin/users"
            className="card hover:shadow-md transition-shadow duration-200 cursor-pointer"
          >
            <div className="flex items-center">
              <Users className="h-8 w-8 text-primary-600 mr-4" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Manage Users</h3>
                <p className="text-gray-600">View and manage all users</p>
              </div>
            </div>
          </a>

          <a
            href="/admin/products"
            className="card hover:shadow-md transition-shadow duration-200 cursor-pointer"
          >
            <div className="flex items-center">
              <Package className="h-8 w-8 text-blue-600 mr-4" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Manage Products</h3>
                <p className="text-gray-600">Add and edit products</p>
              </div>
            </div>
          </a>

          <a
            href="/admin/orders"
            className="card hover:shadow-md transition-shadow duration-200 cursor-pointer"
          >
            <div className="flex items-center">
              <ShoppingCart className="h-8 w-8 text-green-600 mr-4" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Manage Orders</h3>
                <p className="text-gray-600">Process and track orders</p>
              </div>
            </div>
          </a>

          <a
            href="/admin/commissions"
            className="card hover:shadow-md transition-shadow duration-200 cursor-pointer"
          >
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-yellow-600 mr-4" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Manage Commissions</h3>
                <p className="text-gray-600">Process commission payments</p>
              </div>
            </div>
          </a>

          <a
            href="/admin/settings"
            className="card hover:shadow-md transition-shadow duration-200 cursor-pointer"
          >
            <div className="flex items-center">
              <Settings className="h-8 w-8 text-purple-600 mr-4" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">System Settings</h3>
                <p className="text-gray-600">Configure platform settings</p>
              </div>
            </div>
          </a>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Orders</h3>
            {stats.recentOrders.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingCart className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600">No recent orders</p>
              </div>
            ) : (
              <div className="space-y-3">
                {stats.recentOrders.map((order: any) => (
                  <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{order.order_number}</p>
                      <p className="text-sm text-gray-600">{order.users?.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{formatCurrency(order.total_amount)}</p>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                        order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {order.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performers</h3>
            {stats.topPerformers.length === 0 ? (
              <div className="text-center py-8">
                <TrendingUp className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600">No performance data yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {stats.topPerformers.map((performer: any, index: number) => (
                  <div key={performer.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center mr-3">
                        <span className="text-sm font-semibold text-primary-600">#{index + 1}</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{performer.name}</p>
                        <p className="text-sm text-gray-600">{performer.ibo_number}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">
                        {performer.orders?.length || 0} orders
                      </p>
                    </div>
                  </div>
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
