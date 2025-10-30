'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'

// Lazy load GenealogyTree to improve initial page load
const GenealogyTree = dynamic(() => import('@/components/GenealogyTree'), {
  loading: () => (
    <div className="flex items-center justify-center py-12">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading genealogy tree...</p>
      </div>
    </div>
  ),
  ssr: false
})
import { 
  Users, 
  UserPlus, 
  Search,
  Calendar,
  TrendingUp,
  DollarSign,
  ChevronRight,
  Copy,
  CheckCircle
} from 'lucide-react'

interface TeamMember {
  id: string
  name: string
  email: string
  ibo_number: string
  created_at: string
  status: 'active' | 'inactive'
  personal_sales: number
  total_earnings: number
}

export default function TeamPage() {
  const { userProfile } = useAuth()
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [referralLink, setReferralLink] = useState('')
  const [linkCopied, setLinkCopied] = useState(false)

  useEffect(() => {
    if (userProfile) {
      fetchTeamMembers()
      generateReferralLink()
    }
  }, [userProfile])

  const fetchTeamMembers = async () => {
    if (!userProfile) return
    
    try {
      // Get direct downline
      const { data: downline, error } = await supabase
        .from('users')
        .select(`
          id,
          name,
          email,
          ibo_number,
          created_at,
          status
        `)
        .eq('sponsor_id', userProfile.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching team members:', error)
        setTeamMembers([])
        setLoading(false)
        return
      }

      // If no downline, show empty state immediately
      if (!downline || downline.length === 0) {
        setTeamMembers([])
        setLoading(false)
        return
      }

      // Batch fetch all stats efficiently - avoid N+1 queries
      const memberIds = downline.map(m => m.id)
      
      // Fetch all orders and commissions in parallel
      const [ordersRes, commissionsRes] = await Promise.all([
        supabase
          .from('orders')
          .select('user_id')
          .in('user_id', memberIds),
        supabase
          .from('commissions')
          .select('user_id, commission_amount')
          .in('user_id', memberIds)
          .eq('status', 'paid')
      ])

      // Group orders by user_id
      const ordersByUser = (ordersRes.data || []).reduce((acc: Record<string, number>, order) => {
        acc[order.user_id] = (acc[order.user_id] || 0) + 1
        return acc
      }, {})

      // Group commissions by user_id
      const earningsByUser = (commissionsRes.data || []).reduce((acc: Record<string, number>, comm) => {
        acc[comm.user_id] = (acc[comm.user_id] || 0) + comm.commission_amount
        return acc
      }, {})

      // Map stats to members
      const membersWithStats = downline.map((member) => ({
        ...member,
        personal_sales: ordersByUser[member.id] || 0,
        total_earnings: earningsByUser[member.id] || 0,
      }))

      setTeamMembers(membersWithStats)
    } catch (error) {
      console.error('Error fetching team members:', error)
      setTeamMembers([])
    } finally {
      setLoading(false)
    }
  }

  const generateReferralLink = () => {
    if (userProfile) {
      const baseUrl = window.location.origin
      // Generate sponsor URL: name-IBO_number format (always use IBO number for compatibility)
      const nameSlug = userProfile.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
      const iboNum = userProfile.ibo_number
      setReferralLink(`${baseUrl}/signup?sponsor=${nameSlug}-${iboNum}`)
    }
  }

  const copyReferralLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy link:', error)
    }
  }

  const filteredMembers = teamMembers.filter(member =>
    member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.ibo_number.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalTeamSales = teamMembers.reduce((sum, member) => sum + member.personal_sales, 0)
  const activeMembers = teamMembers.filter(member => member.status === 'active').length

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
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Team Management</h2>
            <p className="text-gray-600">Loading your team data...</p>
          </div>
          
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading team information...</p>
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
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Team Management</h2>
          <p className="text-gray-600">Manage your downline and track team performance</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="card">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-8 w-8 text-primary-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Team Members</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {teamMembers.length}
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
                <p className="text-sm font-medium text-gray-600">Active Members</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {activeMembers}
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
                <p className="text-sm font-medium text-gray-600">Team Sales</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {totalTeamSales}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Referral Link Section */}
        <div className="card mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Referral Link</h3>
          <div className="flex items-center space-x-4">
            <div className="flex-1 min-w-0">
              <input
                type="text"
                value={referralLink}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm truncate"
                title={referralLink}
              />
            </div>
            <button
              onClick={copyReferralLink}
              className="btn-primary flex items-center"
            >
              {linkCopied ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Link
                </>
              )}
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Share this link to recruit new team members. They'll automatically be assigned to your downline.
          </p>
        </div>

        {/* Search and Filter */}
        <div className="card mb-6">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search team members..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Genealogy Tree */}
        <div className="card mb-8">
          <GenealogyTree />
        </div>

        {/* Team Members List */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Team Members</h3>
          
          {filteredMembers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? 'No team members found' : 'No team members yet'}
              </h3>
              <p className="text-gray-600 mb-6">
                {searchTerm 
                  ? 'No team members match your search criteria. Try different search terms.'
                  : 'You haven\'t recruited any team members yet. Share your referral link to start building your team and earning commissions!'
                }
              </p>
              {!searchTerm && (
                <div className="space-y-4">
                  <button
                    onClick={copyReferralLink}
                    className="btn-primary flex items-center mx-auto"
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Copy Referral Link
                  </button>
                  <p className="text-sm text-gray-500">
                    Share this link with friends and family to recruit them to your team
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
                      Member
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      IBO Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Join Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sales
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Earnings
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredMembers.map((member) => (
                    <tr key={member.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {member.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {member.email}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {member.ibo_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(member.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          member.status === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {member.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {member.personal_sales}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(member.total_earnings)}
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