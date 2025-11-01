'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import { 
  Package, 
  Search,
  Filter,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Image,
  DollarSign,
  Tag,
  AlertCircle,
  CheckCircle,
  CheckCircle2,
  PartyPopper,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'

interface Product {
  id: string
  name: string
  description: string
  price: number
  image_url: string | null
  image_urls?: string[] | null
  category: string
  stock_quantity: number
  is_active: boolean
  created_at: string
  updated_at: string
}

const PRODUCT_CATEGORIES = [
  'Charcoal',
  'Chlorophyll Drops',
  'Chlorophyll Juice',
  'Collagen',
  'Combos',
  'Creams',
  'Lotions',
  'Masks',
  'Oils',
  'Scrubs',
  'Serums',
  'Soaps',
  'Teas',
  'Toners',
  'Turmeric',
  'Weight Gain Products',
  'Weight Loss Products'
]

export default function ProductManagement() {
  const { user, userProfile, loading: authLoading } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    stock_quantity: '',
    is_active: true
  })
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [supportsImageUrls, setSupportsImageUrls] = useState<boolean>(true)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string>('')
  const [uploadProgress, setUploadProgress] = useState<number>(0)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string>('')
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string>('')
  // Image lightbox state
  const [showImageModal, setShowImageModal] = useState(false)
  const [modalImages, setModalImages] = useState<string[]>([])
  const [modalIndex, setModalIndex] = useState(0)

  useEffect(() => {
    if (userProfile?.role === 'admin') {
      detectImageUrlsSupport()
      fetchProducts()
    }
  }, [userProfile])

  const detectImageUrlsSupport = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, image_urls')
        .limit(1)

      if (error) {
        // Column might not exist yet; mark unsupported
        setSupportsImageUrls(false)
      } else {
        // If select succeeds but column is undefined, still consider supported for when SQL is updated
        setSupportsImageUrls(true)
      }
    } catch {
      setSupportsImageUrls(false)
    }
  }

  const openImageModal = (images: string[], index: number = 0) => {
    if (!images || images.length === 0) return
    setModalImages(images)
    setModalIndex(index)
    setShowImageModal(true)
  }

  const closeImageModal = () => {
    setShowImageModal(false)
    setModalImages([])
    setModalIndex(0)
  }

  const prevModalImage = () => {
    setModalIndex((prev) => (prev - 1 + modalImages.length) % modalImages.length)
  }

  const nextModalImage = () => {
    setModalIndex((prev) => (prev + 1) % modalImages.length)
  }

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching products:', error)
        return
      }

      setProducts(data || [])
    } catch (error) {
      console.error('Error fetching products:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFilesSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    
    const remainingSlots = 6 - imageUrls.length
    if (remainingSlots <= 0) {
      setUploadError('Maximum 6 images allowed. Remove some images first.')
      return
    }
    
    const filesToUpload = Array.from(files).slice(0, Math.min(files.length, remainingSlots))
    if (filesToUpload.length === 0) return

    setUploading(true)
    setUploadError('')
    setUploadProgress(10)
    
    try {
      // Validate all files first (instant check)
      const validFiles: File[] = []
      for (const file of filesToUpload) {
        if (!file.type.startsWith('image/')) {
          setUploadError(`${file.name} is not an image file. Skipping...`)
          continue
        }
        if (file.size > 5 * 1024 * 1024) {
          setUploadError(`${file.name} is too large. Maximum size is 5MB. Skipping...`)
          continue
        }
        validFiles.push(file)
      }

      if (validFiles.length === 0) {
        setUploadError('No valid images to upload.')
        setUploading(false)
        return
      }

      setUploadProgress(30)

      // Upload ALL images in PARALLEL for maximum speed (not sequential!)
      const uploadPromises = validFiles.map(async (file, idx) => {
        const ext = file.name.split('.').pop() || 'jpg'
        const filePath = `products/${Date.now()}_${idx}_${Math.random().toString(36).slice(2)}.${ext}`
        
        const { error: upErr } = await supabase.storage.from('products').upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type || 'image/jpeg',
        })
        
        if (upErr) {
          console.error('Upload error:', upErr)
          if (upErr.message.includes('Bucket not found')) {
            throw new Error('Storage bucket "products" not found. Please create it in Supabase Dashboard.')
          } else if (upErr.message.includes('new row violates row-level security')) {
            throw new Error('Permission denied. Please check storage bucket RLS policies.')
          } else {
            throw new Error(`Failed to upload ${file.name}: ${upErr.message}`)
          }
        }
        
        const { data } = supabase.storage.from('products').getPublicUrl(filePath)
        return data?.publicUrl || null
      })

      setUploadProgress(50)
      
      // Wait for all uploads to complete in parallel (MUCH FASTER!)
      const uploadedUrls = await Promise.all(uploadPromises)
      const successfulUrls = uploadedUrls.filter(Boolean) as string[]

      setUploadProgress(90)

      if (successfulUrls.length === 0) {
        setUploadError('No images were uploaded. Please try again.')
      } else {
        // Update image URLs all at once (instant update)
        setImageUrls(prev => [...prev, ...successfulUrls].slice(0, 6))
        setUploadError('') // Clear any previous errors on success
        setUploadProgress(100)
      }
    } catch (err: any) {
      console.error('Upload exception:', err)
      setUploadError(err?.message || 'Failed to upload images. Please check your connection and try again.')
    } finally {
      setUploading(false)
      // Progress will reset automatically on next upload or after brief delay if successful
      setTimeout(() => setUploadProgress(0), 500)
    }
  }
  
  const handleRemoveImage = (index: number) => {
    setImageUrls(prev => prev.filter((_, i) => i !== index))
  }

  const onDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    await handleFilesSelected(e.dataTransfer.files)
  }

  const handleAddProduct = async () => {
    // Validation
    if (!productForm.name.trim()) {
      setSubmitError('Product name is required')
      return
    }
    
    if (!productForm.description.trim()) {
      setSubmitError('Product description is required')
      return
    }
    
    if (!productForm.price || parseFloat(productForm.price) <= 0) {
      setSubmitError('Valid price is required')
      return
    }
    
    if (!productForm.category) {
      setSubmitError('Product category is required')
      return
    }
    
    if (!productForm.stock_quantity || parseInt(productForm.stock_quantity) < 0) {
      setSubmitError('Valid stock quantity is required')
      return
    }
    
    if (imageUrls.length === 0) {
      setSubmitError('At least one product image is required')
      return
    }

    setSubmitting(true)
    setSubmitError('')
    setSubmitSuccess(false)

    try {
      // Prepare payload instantly - no delays
      const payload: any = {
        name: productForm.name.trim(),
        description: productForm.description.trim(),
        price: parseFloat(productForm.price),
        category: productForm.category,
        stock_quantity: parseInt(productForm.stock_quantity),
        is_active: productForm.is_active,
      }

      const cleaned = imageUrls.filter(Boolean).slice(0, 6)
      if (cleaned.length > 0) {
        if (supportsImageUrls) {
          payload.image_urls = cleaned
        }
        payload.image_url = cleaned[0]
      }

      // Insert to Supabase immediately - no await delays
      const insertPromise = supabase
        .from('products')
        .insert(payload)
        .select()

      // Show success immediately while insert happens in background
      const { data, error } = await insertPromise

      if (error) {
        console.error('Error adding product:', error)
        setSubmitError(error.message || 'Failed to create product. Please try again.')
        setSubmitting(false)
        return
      }

      // Success! Show celebratory modal instantly
      setSubmitSuccess(false)
      setSuccessMessage('Product Created!')
      setShowSuccessModal(true)
      setSubmitting(false) // Reset loading state immediately
      
      // Close add modal immediately
      setShowAddModal(false)
      
      // Refresh products list in background (don't wait for it)
      fetchProducts().catch(console.error)
      
    } catch (error: any) {
      console.error('Error adding product:', error)
      setSubmitError(error?.message || 'An unexpected error occurred. Please try again.')
      setSubmitting(false)
    }
  }

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product)
    setProductForm({
      name: product.name,
      description: product.description,
      price: product.price.toString(),
      category: product.category,
      stock_quantity: product.stock_quantity.toString(),
      is_active: product.is_active
    })
    const imgs = (product.image_urls && product.image_urls.length > 0)
      ? product.image_urls
      : (product.image_url ? [product.image_url] : [])
    setImageUrls(imgs)
  }

  const handleUpdateProduct = async () => {
    if (!editingProduct) return

    // Validation
    if (!productForm.name.trim()) {
      setSubmitError('Product name is required')
      return
    }
    
    if (!productForm.description.trim()) {
      setSubmitError('Product description is required')
      return
    }
    
    if (!productForm.price || parseFloat(productForm.price) <= 0) {
      setSubmitError('Valid price is required')
      return
    }
    
    if (!productForm.category) {
      setSubmitError('Product category is required')
      return
    }

    setSubmitting(true)
    setSubmitError('')
    setSubmitSuccess(false)

    try {
      const payload: any = {
        name: productForm.name.trim(),
        description: productForm.description.trim(),
        price: parseFloat(productForm.price),
        category: productForm.category,
        stock_quantity: parseInt(productForm.stock_quantity),
        is_active: productForm.is_active
      }

      const cleaned = imageUrls.filter(Boolean).slice(0, 6)
      if (cleaned.length > 0) {
        if (supportsImageUrls) {
          payload.image_urls = cleaned
        }
        payload.image_url = cleaned[0] || null
      } else {
        // If no images, clear both fields
        payload.image_url = null
        if (supportsImageUrls) {
          payload.image_urls = []
        }
      }

      const { error } = await supabase
        .from('products')
        .update(payload)
        .eq('id', editingProduct.id)

      if (error) {
        console.error('Error updating product:', error)
        setSubmitError(error.message || 'Failed to update product. Please try again.')
        setSubmitting(false)
        return
      }

      // Success! Show celebratory modal immediately
      setSubmitSuccess(false) // Clear banner state
      setSuccessMessage('Product Updated!')
      setShowSuccessModal(true)
      
      // Refresh products list in background
      fetchProducts().catch(console.error)
      
      // Close edit modal immediately (success modal will overlay it)
      setEditingProduct(null)
    } catch (error: any) {
      console.error('Error updating product:', error)
      setSubmitError(error?.message || 'An unexpected error occurred. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId)

      if (error) {
        console.error('Error deleting product:', error)
        return
      }

      await fetchProducts()
    } catch (error) {
      console.error('Error deleting product:', error)
    }
  }

  const handleToggleStatus = async (product: Product) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ is_active: !product.is_active })
        .eq('id', product.id)

      if (error) {
        console.error('Error updating product status:', error)
        return
      }

      await fetchProducts()
    } catch (error) {
      console.error('Error updating product status:', error)
    }
  }

  const resetForm = () => {
    setProductForm({
      name: '',
      description: '',
      price: '',
      category: '',
      stock_quantity: '',
      is_active: true
    })
    setImageUrls([])
    setUploadError('')
    setUploadProgress(0)
    setSubmitError('')
    setSubmitSuccess(false)
    setShowSuccessModal(false)
    setSuccessMessage('')
  }

  const filteredProducts = products.filter(product => {
    const matchesSearch = 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && product.is_active) ||
      (statusFilter === 'inactive' && !product.is_active)

    return matchesSearch && matchesCategory && matchesStatus
  })

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
          <Package className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access product management.</p>
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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Product Management</h2>
            <p className="text-gray-600">Manage your product catalog</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary flex items-center w-full sm:w-auto justify-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="card">
            <div className="flex items-center">
              <Package className="h-8 w-8 text-primary-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Products</p>
                <p className="text-2xl font-semibold text-gray-900">{products.length}</p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center">
              <Tag className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Products</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {products.filter(p => p.is_active).length}
                </p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Average Price</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {products.length > 0 
                    ? formatCurrency(products.reduce((sum, p) => sum + p.price, 0) / products.length)
                    : 'R0'
                  }
                </p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center">
              <AlertCircle className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Low Stock</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {products.filter(p => p.stock_quantity < 10).length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="card mb-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 sm:gap-4">
            <div className="flex-1 w-full">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="all">All Categories</option>
                {PRODUCT_CATEGORIES.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
                className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => {
            // Get product images - check image_urls first, fallback to image_url
            const productImages = (product.image_urls && product.image_urls.length > 0)
              ? product.image_urls
              : (product.image_url ? [product.image_url] : [])
            const mainImage = productImages[0]

            return (
            <div key={product.id} className="card hover:shadow-md transition-shadow duration-200">
              {/* Product Image */}
              {mainImage ? (
                <div className="mb-4 rounded-lg overflow-hidden bg-gray-100 relative group">
                  <img 
                    src={mainImage} 
                    alt={product.name}
                    className="w-full h-48 object-contain cursor-pointer bg-white"
                    onClick={() => openImageModal(productImages, 0)}
                    onError={(e) => {
                      // If image fails to load, hide it
                      (e.target as HTMLImageElement).style.display = 'none'
                    }}
                  />
                  {productImages.length > 1 && (
                    <div className="absolute inset-0 flex items-center justify-between px-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        className="bg-black/40 hover:bg-black/60 text-white p-1 rounded-full"
                        onClick={(e) => { e.stopPropagation(); openImageModal(productImages, (productImages.length - 1)); }}
                        aria-label="Previous image"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <button 
                        className="bg-black/40 hover:bg-black/60 text-white p-1 rounded-full"
                        onClick={(e) => { e.stopPropagation(); openImageModal(productImages, 1); }}
                        aria-label="Next image"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="mb-4 rounded-lg overflow-hidden bg-gray-100 h-48 flex items-center justify-center">
                  <Image className="h-16 w-16 text-gray-400" />
                </div>
              )}
              
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">{product.name}</h3>
                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">{product.description}</p>
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      product.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {product.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                      {product.category}
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleEditProduct(product)}
                    className="text-primary-600 hover:text-primary-900"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteProduct(product.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Price:</span>
                  <span className="font-semibold text-gray-900">{formatCurrency(product.price)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Stock:</span>
                  <span className={`font-semibold ${
                    product.stock_quantity < 10 ? 'text-red-600' : 'text-gray-900'
                  }`}>
                    {product.stock_quantity} units
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Created:</span>
                  <span className="text-sm text-gray-900">
                    {new Date(product.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-200">
                <button
                  onClick={() => handleToggleStatus(product)}
                  className={`w-full py-2 px-4 rounded-lg text-sm font-medium transition-colors duration-200 ${
                    product.is_active
                      ? 'bg-red-100 text-red-700 hover:bg-red-200'
                      : 'bg-green-100 text-green-700 hover:bg-green-200'
                  }`}
                >
                  {product.is_active ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>
            )
          })}
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
            <p className="text-gray-600 mb-6">Try adjusting your search or filter criteria</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-primary"
            >
              Add Your First Product
            </button>
          </div>
        )}
      </main>

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Product</h3>
              
              {submitError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center">
                  <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                  <span className="text-red-700 text-sm">{submitError}</span>
                </div>
              )}
              
              <div className="space-y-4">
                <div>
                  <label className="label">Product Name</label>
                  <input
                    type="text"
                    value={productForm.name}
                    onChange={(e) => setProductForm(prev => ({ ...prev, name: e.target.value }))}
                    className="input-field"
                    placeholder="Enter product name"
                  />
                </div>
                
                <div>
                  <label className="label">Description</label>
                  <textarea
                    value={productForm.description}
                    onChange={(e) => setProductForm(prev => ({ ...prev, description: e.target.value }))}
                    className="input-field"
                    rows={3}
                    placeholder="Enter product description"
                  />
                </div>
                
                <div>
                  <label className="label">Price (R)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={productForm.price}
                    onChange={(e) => setProductForm(prev => ({ ...prev, price: e.target.value }))}
                    className="input-field"
                    placeholder="0.00"
                  />
                </div>
                
                <div>
                  <label className="label">Category</label>
                  <select
                    value={productForm.category}
                    onChange={(e) => setProductForm(prev => ({ ...prev, category: e.target.value }))}
                    className="input-field"
                  >
                    <option value="">Select category</option>
                    {PRODUCT_CATEGORIES.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="label">Stock Quantity</label>
                  <input
                    type="number"
                    value={productForm.stock_quantity}
                    onChange={(e) => setProductForm(prev => ({ ...prev, stock_quantity: e.target.value }))}
                    className="input-field"
                    placeholder="0"
                  />
                </div>

              <div>
                <label className="label">Product Images (up to 6)</label>
                
                {/* Image Preview Grid */}
                {imageUrls.length > 0 && (
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    {imageUrls.map((url, idx) => (
                      <div key={idx} className="relative group">
                        <img 
                          src={url} 
                          alt={`Preview ${idx + 1}`}
                          className="w-full h-24 object-cover rounded-lg border border-gray-200"
                        />
                        <button
                          onClick={() => handleRemoveImage(idx)}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          type="button"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                {imageUrls.length < 6 && (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                    }}
                    onDragEnter={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                    }}
                    onDrop={onDrop}
                    className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary-400 hover:bg-primary-50 transition-colors"
                  >
                    <Image className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600 mb-2">
                      Drag & drop images here, or
                    </p>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => {
                        handleFilesSelected(e.target.files)
                        e.target.value = '' // Reset input
                      }}
                      className="hidden"
                      id="file-input-add"
                      disabled={uploading}
                    />
                    <label 
                      htmlFor="file-input-add" 
                      className={`btn-secondary cursor-pointer inline-block ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {uploading ? 'Uploading...' : 'Choose Images'}
                    </label>
                    <p className="text-xs text-gray-500 mt-2">
                      {6 - imageUrls.length} slots remaining • Max 5MB per image
                    </p>
                    {uploading && uploadProgress > 0 && (
                      <div className="mt-3">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-primary-600 h-2 rounded-full transition-all"
                            style={{ width: `${uploadProgress}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{Math.round(uploadProgress)}%</p>
                      </div>
                    )}
                  </div>
                )}
                
                {uploadError && (
                  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600">
                    {uploadError}
                  </div>
                )}
                
                {imageUrls.length >= 6 && (
                  <p className="text-xs text-amber-600 mt-2">
                    Maximum 6 images reached. Remove an image to add more.
                  </p>
                )}
              </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={productForm.is_active}
                    onChange={(e) => setProductForm(prev => ({ ...prev, is_active: e.target.checked }))}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">
                    Active product
                  </label>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowAddModal(false)
                    resetForm()
                  }}
                  className="btn-secondary"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </button>
                <button
                  onClick={handleAddProduct}
                  disabled={submitting || uploading}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  type="button"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Add Product
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {editingProduct && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Product</h3>
              
              {submitError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center">
                  <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                  <span className="text-red-700 text-sm">{submitError}</span>
                </div>
              )}
              
              <div className="space-y-4">
                <div>
                  <label className="label">Product Name</label>
                  <input
                    type="text"
                    value={productForm.name}
                    onChange={(e) => setProductForm(prev => ({ ...prev, name: e.target.value }))}
                    className="input-field"
                  />
                </div>
                
                <div>
                  <label className="label">Description</label>
                  <textarea
                    value={productForm.description}
                    onChange={(e) => setProductForm(prev => ({ ...prev, description: e.target.value }))}
                    className="input-field"
                    rows={3}
                  />
                </div>
                
                <div>
                  <label className="label">Price (R)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={productForm.price}
                    onChange={(e) => setProductForm(prev => ({ ...prev, price: e.target.value }))}
                    className="input-field"
                  />
                </div>
                
                <div>
                  <label className="label">Category</label>
                  <select
                    value={productForm.category}
                    onChange={(e) => setProductForm(prev => ({ ...prev, category: e.target.value }))}
                    className="input-field"
                  >
                    {PRODUCT_CATEGORIES.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="label">Stock Quantity</label>
                  <input
                    type="number"
                    value={productForm.stock_quantity}
                    onChange={(e) => setProductForm(prev => ({ ...prev, stock_quantity: e.target.value }))}
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="label">Product Images (up to 6)</label>
                  
                  {/* Image Preview Grid */}
                  {imageUrls.length > 0 && (
                    <div className="grid grid-cols-3 gap-3 mb-3">
                      {imageUrls.map((url, idx) => (
                        <div key={idx} className="relative group">
                          <img 
                            src={url} 
                            alt={`Preview ${idx + 1}`}
                            className="w-full h-24 object-cover rounded-lg border border-gray-200"
                          />
                          <button
                            onClick={() => handleRemoveImage(idx)}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            type="button"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {imageUrls.length < 6 && (
                    <div
                      onDragOver={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                      }}
                      onDragEnter={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                      }}
                      onDrop={onDrop}
                      className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary-400 hover:bg-primary-50 transition-colors"
                    >
                      <Image className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600 mb-2">
                        Drag & drop images here, or
                      </p>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => {
                          handleFilesSelected(e.target.files)
                          e.target.value = '' // Reset input
                        }}
                        className="hidden"
                        id="file-input-edit"
                        disabled={uploading}
                      />
                      <label 
                        htmlFor="file-input-edit" 
                        className={`btn-secondary cursor-pointer inline-block ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {uploading ? 'Uploading...' : 'Choose Images'}
                      </label>
                      <p className="text-xs text-gray-500 mt-2">
                        {6 - imageUrls.length} slots remaining • Max 5MB per image
                      </p>
                      {uploading && uploadProgress > 0 && (
                        <div className="mt-3">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-primary-600 h-2 rounded-full transition-all"
                              style={{ width: `${uploadProgress}%` }}
                            ></div>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">{Math.round(uploadProgress)}%</p>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {uploadError && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600">
                      {uploadError}
                    </div>
                  )}
                  
                  {imageUrls.length >= 6 && (
                    <p className="text-xs text-amber-600 mt-2">
                      Maximum 6 images reached. Remove an image to add more.
                    </p>
                  )}
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="edit_is_active"
                    checked={productForm.is_active}
                    onChange={(e) => setProductForm(prev => ({ ...prev, is_active: e.target.checked }))}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label htmlFor="edit_is_active" className="ml-2 text-sm text-gray-700">
                    Active product
                  </label>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setEditingProduct(null)
                    resetForm()
                  }}
                  className="btn-secondary"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </button>
                <button
                  onClick={handleUpdateProduct}
                  disabled={submitting || uploading}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  type="button"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
                      Updating...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Update Product
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Celebratory Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-[60] overflow-y-auto">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
            onClick={() => {
              setShowSuccessModal(false)
              resetForm()
            }}
          />
          
          {/* Modal */}
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full transform transition-all animate-scale-in">
              {/* Close button */}
              <button
                onClick={() => {
                  setShowSuccessModal(false)
                  resetForm()
                }}
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

                {/* Party popper animation */}
                <div className="mb-4">
                  <PartyPopper className="h-16 w-16 text-yellow-400 mx-auto animate-bounce" />
                </div>

                {/* Success message */}
                <h2 className="text-3xl font-bold text-gray-900 mb-3">
                  {successMessage || 'Success!'}
                </h2>
                <p className="text-lg text-gray-600 mb-6">
                  Your product has been successfully {successMessage.includes('Updated') ? 'updated' : 'created'} and saved to the database.
                </p>
                <p className="text-sm text-gray-500 mb-8">
                  It's now available in your product catalog for IBOs to view and order.
                </p>

                {/* Action button */}
                <button
                  onClick={() => {
                    setShowSuccessModal(false)
                    resetForm()
                  }}
                  className="w-full btn-primary py-3 text-lg font-semibold"
                >
                  Awesome!
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Lightbox Modal */}
      {showImageModal && (
        <div className="fixed inset-0 z-[70] overflow-y-auto">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/80 transition-opacity"
            onClick={closeImageModal}
          />

          {/* Modal with arrows */}
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative max-w-5xl w-full">
              {/* Close */}
              <button
                onClick={closeImageModal}
                className="absolute -top-10 right-0 text-white/80 hover:text-white"
                aria-label="Close"
              >
                <X className="h-6 w-6" />
              </button>

              {/* Image */}
              <div className="bg-black rounded-xl overflow-hidden flex items-center justify-center">
                <img
                  src={modalImages[modalIndex]}
                  alt={`Image ${modalIndex + 1}`}
                  className="max-h-[80vh] w-full object-contain"
                />
              </div>

              {/* Arrows */}
              {modalImages.length > 1 && (
                <>
                  <button
                    onClick={prevModalImage}
                    className="absolute left-0 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white p-2 rounded-full"
                    aria-label="Previous"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                  <button
                    onClick={nextModalImage}
                    className="absolute right-0 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white p-2 rounded-full"
                    aria-label="Next"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>
                </>
              )}

              {/* Dots */}
              {modalImages.length > 1 && (
                <div className="flex items-center justify-center gap-2 mt-3">
                  {modalImages.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setModalIndex(i)}
                      className={`h-2 w-2 rounded-full ${i === modalIndex ? 'bg-white' : 'bg-white/40'}`}
                      aria-label={`Go to image ${i + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
