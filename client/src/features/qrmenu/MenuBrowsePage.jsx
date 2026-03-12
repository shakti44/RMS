/**
 * MenuBrowsePage — Main QR guest menu experience.
 * Accessed via: /{tenantSlug}/menu?table={qrToken}
 *
 * Features:
 *  - Category tabs with sticky positioning
 *  - Item cards grouped by category
 *  - Floating cart bar
 *  - Real-time order status after placing
 */
import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/axiosInstance';
import { CartProvider, useCart } from '../../context/CartContext';
import MenuItemCard from './components/MenuItemCard';
import CartDrawer from './components/CartDrawer';

function MenuContent({ restaurantId, tableId }) {
  const { items: cartItems, clearCart } = useCart();
  const navigate    = useNavigate();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['menu', restaurantId],
    queryFn:  () => api.get(`/menu/public/${restaurantId}`).then((r) => r.data.data),
    enabled:  !!restaurantId,
  });

  const { mutate: placeOrder, isPending } = useMutation({
    mutationFn: (payload) => api.post('/orders', payload).then((r) => r.data.data),
    onSuccess:  (order) => {
      clearCart();
      toast.success('Order placed!');
      navigate(`/order-status/${order.id}`);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to place order');
    },
  });

  const handlePlaceOrder = () => {
    const orderItems = cartItems.map((item) => ({
      menuItemId:        item.id,
      quantity:          item.quantity,
      modifierOptionIds: (item.selectedModifiers || []).map((m) => m.id),
      specialNote:       item.specialNote || '',
    }));
    placeOrder({
      restaurantId,
      tableId,
      orderType: tableId ? 'dine_in' : 'takeaway',
      items:     orderItems,
    });
  };

  // Filter by search
  const filteredData = data?.map((cat) => ({
    ...cat,
    items: cat.items.filter((i) =>
      !search || i.name.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter((cat) => cat.items.length > 0);

  const categories = data || [];
  const active = activeCategory || categories[0]?.id;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-gray-500">Loading menu…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      {/* Header */}
      <div className="bg-white sticky top-0 z-20 shadow-sm">
        <div className="px-4 pt-4 pb-2">
          <h1 className="text-lg font-bold text-gray-900">Our Menu</h1>
          {tableId && <p className="text-xs text-gray-500">Table order</p>}
        </div>

        {/* Search bar */}
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2">
            <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <input
              type="text"
              placeholder="Search dishes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent text-sm flex-1 outline-none placeholder-gray-400"
            />
          </div>
        </div>

        {/* Category tabs */}
        <div className="overflow-x-auto scrollbar-hide">
          <div className="flex gap-1 px-4 pb-3 w-max">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  setActiveCategory(cat.id);
                  document.getElementById(`cat-${cat.id}`)?.scrollIntoView({ behavior: 'smooth' });
                }}
                className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  active === cat.id
                    ? 'bg-brand-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Menu sections */}
      <div className="px-4 py-4 space-y-6">
        {(filteredData || []).map((category) => (
          <section key={category.id} id={`cat-${category.id}`}>
            <h2 className="text-base font-bold text-gray-800 mb-3 flex items-center gap-2">
              {category.name}
              <span className="text-xs font-normal text-gray-400">({category.items.length})</span>
            </h2>
            <div className="space-y-3">
              {category.items.map((item) => (
                <MenuItemCard key={item.id} item={item} />
              ))}
            </div>
          </section>
        ))}

        {filteredData?.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">🔍</p>
            <p className="text-sm">No items found for "{search}"</p>
          </div>
        )}
      </div>

      {/* Cart drawer */}
      <CartDrawer onPlaceOrder={handlePlaceOrder} isPlacing={isPending} />
    </div>
  );
}

export default function MenuBrowsePage() {
  const { tenantSlug }  = useParams();
  const [params]        = useSearchParams();
  const tableToken      = params.get('table');
  const [restaurantId, setRestaurantId] = useState(params.get('restaurant'));
  const [resolving, setResolving]       = useState(!params.get('restaurant'));

  // If no restaurantId in URL, look it up by tenantSlug
  useEffect(() => {
    if (restaurantId) return;
    api.get(`/menu/public/tenant/${tenantSlug}/restaurant`)
      .then((r) => setRestaurantId(r.data.data.restaurantId))
      .catch(() => toast.error('Restaurant not found'))
      .finally(() => setResolving(false));
  }, [tenantSlug, restaurantId]);

  if (resolving) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <CartProvider>
      <MenuContent restaurantId={restaurantId} tableId={tableToken} />
    </CartProvider>
  );
}
