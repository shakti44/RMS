/**
 * POSPage — Staff Point-of-Sale interface.
 *
 * Three-column layout (mobile collapses to tabs):
 *  [Tables] | [Menu Search + Items] | [Order Panel]
 */
import { useState, useReducer, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, UtensilsCrossed } from 'lucide-react';
import api from '../../api/axiosInstance';
import TableGrid from './components/TableGrid';
import OrderPanel from './components/OrderPanel';

const restaurantId = localStorage.getItem('restaurantId');

// Cart reducer (same logic as CartContext but local to POS)
const cartReducer = (state, action) => {
  switch (action.type) {
    case 'ADD': {
      const key = `${action.item.id}-pos`;
      const ex  = state.find((i) => i._key === key);
      if (ex) return state.map((i) => i._key === key ? { ...i, quantity: i.quantity + 1 } : i);
      return [...state, { ...action.item, _key: key, quantity: 1 }];
    }
    case 'UPDATE': return state.map((i) => i._key === action.key ? { ...i, quantity: action.qty } : i).filter((i) => i.quantity > 0);
    case 'REMOVE': return state.filter((i) => i._key !== action.key);
    case 'CLEAR':  return [];
    default:       return state;
  }
};

export default function POSPage() {
  const [selectedTable, setSelectedTable] = useState(null);
  const [search, setSearch]   = useState('');
  const [activeTab, setActiveTab] = useState('tables'); // mobile tabs: tables | menu | order
  const [cart, dispatch]      = useReducer(cartReducer, []);

  // Fetch full menu (all categories)
  const { data: categories = [] } = useQuery({
    queryKey: ['menu-pos', restaurantId],
    queryFn:  () =>
      api.get(`/menu/public/${restaurantId}`).then((r) => r.data.data),
    enabled: !!restaurantId,
  });

  const allItems = categories.flatMap((c) => c.items || []);
  const filtered = search
    ? allItems.filter((i) => i.name.toLowerCase().includes(search.toLowerCase()))
    : allItems;

  const addToCart  = useCallback((item) => {
    dispatch({ type: 'ADD', item });
    setActiveTab('order');
  }, []);
  const updateQty  = useCallback((key, qty) => dispatch({ type: 'UPDATE', key, qty }), []);
  const removeItem = useCallback((key) => dispatch({ type: 'REMOVE', key }),            []);
  const clearCart  = useCallback(() => dispatch({ type: 'CLEAR' }),                     []);

  return (
    <div className="h-full flex flex-col">
      {/* Mobile tab switcher */}
      <div className="md:hidden flex bg-white border-b">
        {['tables', 'menu', 'order'].map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`flex-1 py-3 text-sm font-semibold capitalize transition-colors ${
              activeTab === t ? 'text-brand-500 border-b-2 border-brand-500' : 'text-gray-500'
            }`}
          >
            {t}{t === 'order' && cart.length > 0 && (
              <span className="ml-1.5 bg-brand-500 text-white text-xs rounded-full px-1.5">{cart.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Desktop: 3-column | Mobile: tab-based */}
      <div className="flex-1 overflow-hidden flex">

        {/* ── Column 1: Tables ─────────────────────────────── */}
        <div className={`w-full md:w-64 md:flex flex-col border-r bg-white ${activeTab !== 'tables' ? 'hidden md:flex' : 'flex'}`}>
          <div className="px-4 py-3 border-b">
            <h2 className="font-semibold text-gray-800 text-sm">Floor Plan</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            <TableGrid
              restaurantId={restaurantId}
              selectedTableId={selectedTable?.id}
              onSelectTable={(table) => {
                setSelectedTable(table);
                setActiveTab('menu');
              }}
            />
          </div>
        </div>

        {/* ── Column 2: Menu search + items ────────────────── */}
        <div className={`flex-1 flex flex-col bg-gray-50 ${activeTab !== 'menu' ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-4 bg-white border-b sticky top-0 z-10">
            {selectedTable && (
              <div className="flex items-center gap-2 mb-3">
                <UtensilsCrossed className="w-4 h-4 text-brand-500" />
                <span className="text-sm font-semibold text-gray-800">Table {selectedTable.name}</span>
                <button onClick={() => setSelectedTable(null)} className="ml-auto text-xs text-gray-400 hover:text-gray-600">
                  Change
                </button>
              </div>
            )}
            <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2">
              <Search className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search menu…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-transparent text-sm flex-1 outline-none placeholder-gray-400"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {/* Category groups */}
            {search ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {filtered.map((item) => (
                  <MenuItemButton key={item.id} item={item} onAdd={addToCart} />
                ))}
              </div>
            ) : (
              categories.map((cat) => (
                <div key={cat.id} className="mb-6">
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{cat.name}</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {cat.items.map((item) => (
                      <MenuItemButton key={item.id} item={item} onAdd={addToCart} />
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── Column 3: Order panel ─────────────────────────── */}
        <div className={`w-full md:w-72 lg:w-80 border-l bg-white ${activeTab !== 'order' ? 'hidden md:flex md:flex-col' : 'flex flex-col'}`}>
          <OrderPanel
            table={selectedTable}
            cartItems={cart}
            onUpdateQty={updateQty}
            onRemoveItem={removeItem}
            onClear={clearCart}
            restaurantId={restaurantId}
          />
        </div>
      </div>
    </div>
  );
}

function MenuItemButton({ item, onAdd }) {
  const veg = item.item_type === 'veg' || item.item_type === 'vegan';
  return (
    <button
      onClick={() => onAdd(item)}
      disabled={!item.is_available}
      className="card p-3 text-left active:scale-95 transition-transform hover:shadow-md disabled:opacity-40"
    >
      {item.image_url && (
        <img src={item.image_url} alt={item.name} className="w-full h-20 object-cover rounded-lg mb-2" loading="lazy" />
      )}
      <p className="text-xs font-semibold text-gray-900 line-clamp-2 leading-tight">{item.name}</p>
      <div className="flex items-center justify-between mt-1.5">
        <span className="text-xs font-bold text-gray-700">₹{item.price}</span>
        <span className={`w-3 h-3 rounded-sm border-2 flex items-center justify-center ${veg ? 'border-green-500' : 'border-red-500'}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${veg ? 'bg-green-500' : 'bg-red-500'}`} />
        </span>
      </div>
    </button>
  );
}
