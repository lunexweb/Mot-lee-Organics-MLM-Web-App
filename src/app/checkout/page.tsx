'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { formatCurrency, generateOrderNumber, generatePaymentReference } from '@/lib/utils'
import { ArrowLeft } from 'lucide-react'

interface ProductRef {
  id: string
  name: string
  price: number
}

interface CartItem {
  product: ProductRef
  quantity: number
}

export default function CheckoutPage() {
  const router = useRouter()
  const { userProfile } = useAuth()
  const [cart, setCart] = useState<CartItem[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [selectedProvince, setSelectedProvince] = useState<string>('')
  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    line1: '',
    line2: '',
    suburb: '',
    city: '',
    province: '',
    postalCode: '',
    notes: '',
  })

  useEffect(() => {
    // Only allow active distributors
    const isActiveIBO = userProfile?.role === 'distributor' && userProfile?.status === 'active'
    if (!isActiveIBO) {
      router.replace('/products')
      return
    }
    try {
      const stored = localStorage.getItem('mlm_cart')
      if (stored) {
        const parsed = JSON.parse(stored) as CartItem[]
        setCart(parsed)
      } else {
        router.replace('/products')
      }
      // Load saved province if available - auto-fill and lock it
      const savedProvince = localStorage.getItem('mlm_selected_province')
      if (savedProvince) {
        setSelectedProvince(savedProvince)
        setForm(prev => ({ ...prev, province: savedProvince }))
      } else {
        // If no province selected in cart, redirect back
        router.replace('/products')
      }
    } catch {
      router.replace('/products')
    }
  }, [router, userProfile])

  const getCartSubtotal = () => cart.reduce((t, i) => t + i.product.price * i.quantity, 0)

  const getTaxAmount = () => {
    const subtotal = getCartSubtotal()
    return subtotal * 0.15 // 15% tax
  }

  const getShippingAmount = () => {
    const province = form.province || selectedProvince
    if (!province) return 0
    return province === 'Gauteng' ? 99.99 : 149.00
  }

  const getCartTotal = () => {
    const subtotal = getCartSubtotal()
    const tax = getTaxAmount()
    const shipping = getShippingAmount()
    return subtotal + tax + shipping
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userProfile || cart.length === 0) return
    setSubmitting(true)
    setError('')
    try {
      const orderNumber = generateOrderNumber()
      const subtotal = getCartSubtotal()
      const tax = getTaxAmount()
      const shipping = getShippingAmount()
      const totalAmount = getCartTotal()
      const paymentReference = generatePaymentReference(orderNumber, userProfile.ibo_number)
      const shippingAddress = {
        fullName: form.fullName,
        phone: form.phone,
        line1: form.line1,
        line2: form.line2,
        suburb: form.suburb,
        city: form.city,
        province: form.province,
        postalCode: form.postalCode,
        notes: form.notes,
      }

      // Create order (no return payload), then fetch id by unique order_number
      const { error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: userProfile.id,
          order_number: orderNumber,
          total_amount: totalAmount,
          status: 'pending',
          shipping_address: shippingAddress as any,
        })

      if (orderError) {
        throw orderError
      }

      const { data: order, error: fetchError } = await supabase
        .from('orders')
        .select('id')
        .eq('order_number', orderNumber)
        .single()

      if (fetchError || !order) {
        throw fetchError || new Error('Order not found after insert')
      }

      // Insert order items
      const itemsPayload = cart.map(ci => ({
        order_id: order.id,
        product_id: ci.product.id,
        quantity: ci.quantity,
        unit_price: ci.product.price,
        total_price: ci.product.price * ci.quantity,
      }))

      const { error: itemsError } = await supabase.from('order_items').insert(itemsPayload)
      if (itemsError) throw itemsError

      // Save reference locally for display on the next page (Phase 1; no DB column yet)
      try {
        localStorage.setItem(`mlm_order_ref_${order.id}`, paymentReference)
      } catch {}

      // Clear cart and go to order view
      try { localStorage.removeItem('mlm_cart') } catch {}
      router.replace(`/orders/${order.id}`)
    } catch (err: any) {
      setError(err?.message || 'Something went wrong while placing your order')
    } finally {
      setSubmitting(false)
    }
  }

  if (cart.length === 0) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <button
          onClick={() => router.push('/products')}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back to Products
        </button>

        <h1 className="text-2xl font-bold text-gray-900 mb-6">Checkout</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <form className="md:col-span-2 card" onSubmit={handleSubmit}>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Delivery details</h2>
            {error && (
              <div className="mb-4 p-3 rounded border border-red-200 bg-red-50 text-red-700 text-sm">{error}</div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Full name</label>
                <input className="input-field" value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} required />
              </div>
              <div>
                <label className="label">Phone</label>
                <input className="input-field" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} required />
              </div>
              <div className="md:col-span-2">
                <label className="label">Address line 1</label>
                <input className="input-field" value={form.line1} onChange={e => setForm({ ...form, line1: e.target.value })} required />
              </div>
              <div className="md:col-span-2">
                <label className="label">Address line 2 (optional)</label>
                <input className="input-field" value={form.line2} onChange={e => setForm({ ...form, line2: e.target.value })} />
              </div>
              <div>
                <label className="label">Suburb</label>
                <input className="input-field" value={form.suburb} onChange={e => setForm({ ...form, suburb: e.target.value })} required />
              </div>
              <div>
                <label className="label">City</label>
                <input className="input-field" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} required />
              </div>
              <div>
                <label className="label">Province</label>
                <select 
                  className="input-field bg-gray-50 cursor-not-allowed" 
                  value={form.province || selectedProvince} 
                  disabled
                  required
                  title="Province is locked from cart selection"
                >
                  <option value="">-- Select Province --</option>
                  <option value="Eastern Cape">Eastern Cape</option>
                  <option value="Free State">Free State</option>
                  <option value="Gauteng">Gauteng</option>
                  <option value="KwaZulu-Natal">KwaZulu-Natal</option>
                  <option value="Limpopo">Limpopo</option>
                  <option value="Mpumalanga">Mpumalanga</option>
                  <option value="Northern Cape">Northern Cape</option>
                  <option value="North West">North West</option>
                  <option value="Western Cape">Western Cape</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Province locked from cart selection. To change, go back to cart.
                </p>
              </div>
              <div>
                <label className="label">Postal code</label>
                <input className="input-field" value={form.postalCode} onChange={e => setForm({ ...form, postalCode: e.target.value })} required />
              </div>
              <div className="md:col-span-2">
                <label className="label">Notes (optional)</label>
                <textarea className="input-field" rows={3} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button type="submit" className="btn-primary disabled:opacity-50" disabled={submitting}>
                {submitting ? 'Placing order...' : 'Place order'}
              </button>
            </div>
          </form>

          <div className="card h-max">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Order summary</h2>
            <div className="space-y-3 mb-4">
              {cart.map((item) => (
                <div className="flex items-center justify-between" key={item.product.id}>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.product.name}</p>
                    <p className="text-xs text-gray-600">{formatCurrency(item.product.price)} × {item.quantity}</p>
                  </div>
                  <div className="text-sm font-semibold">{formatCurrency(item.product.price * item.quantity)}</div>
                </div>
              ))}
            </div>
            
            {/* Order Breakdown */}
            <div className="border-t border-gray-200 pt-3 space-y-2 mb-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Subtotal:</span>
                <span className="text-gray-900 font-medium">
                  {formatCurrency(getCartSubtotal())}
                </span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Tax (15%):</span>
                <span className="text-gray-900 font-medium">
                  {formatCurrency(getTaxAmount())}
                </span>
              </div>

              {(form.province || selectedProvince) && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Shipping:</span>
                  <span className="text-gray-900 font-medium">
                    {formatCurrency(getShippingAmount())}
                  </span>
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 pt-3 flex items-center justify-between">
              <span className="text-lg font-semibold text-gray-900">Total</span>
              <span className="text-lg font-bold text-primary-600">{formatCurrency(getCartTotal())}</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}


