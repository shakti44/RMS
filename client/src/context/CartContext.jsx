import { createContext, useContext, useReducer, useCallback } from 'react';

const CartContext = createContext(null);

const cartReducer = (state, action) => {
  switch (action.type) {
    case 'ADD_ITEM': {
      const key = `${action.item.id}-${JSON.stringify(action.item.selectedModifiers || [])}`;
      const existing = state.items.find((i) => i._key === key);
      if (existing) {
        return {
          ...state,
          items: state.items.map((i) =>
            i._key === key ? { ...i, quantity: i.quantity + (action.qty || 1) } : i
          ),
        };
      }
      return {
        ...state,
        items: [...state.items, { ...action.item, _key: key, quantity: action.qty || 1 }],
      };
    }
    case 'REMOVE_ITEM':
      return { ...state, items: state.items.filter((i) => i._key !== action.key) };
    case 'UPDATE_QTY':
      return {
        ...state,
        items: state.items
          .map((i) => (i._key === action.key ? { ...i, quantity: action.qty } : i))
          .filter((i) => i.quantity > 0),
      };
    case 'CLEAR':
      return { items: [] };
    default:
      return state;
  }
};

export const CartProvider = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, { items: [] });

  const addItem      = useCallback((item, qty = 1) => dispatch({ type: 'ADD_ITEM',     item, qty }), []);
  const removeItem   = useCallback((key)           => dispatch({ type: 'REMOVE_ITEM',  key }),       []);
  const updateQty    = useCallback((key, qty)      => dispatch({ type: 'UPDATE_QTY',   key, qty }),  []);
  const clearCart    = useCallback(()              => dispatch({ type: 'CLEAR' }),                   []);

  const itemCount = state.items.reduce((s, i) => s + i.quantity, 0);
  const subtotal  = state.items.reduce((s, i) => {
    const modTotal = (i.selectedModifiers || []).reduce((m, mod) => m + (mod.price_delta || 0), 0);
    return s + (i.price + modTotal) * i.quantity;
  }, 0);

  return (
    <CartContext.Provider value={{ items: state.items, itemCount, subtotal, addItem, removeItem, updateQty, clearCart }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
