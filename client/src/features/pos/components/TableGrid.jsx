/**
 * TableGrid — Visual floor plan for the POS.
 * Each table shows its status with a color-coded card.
 * Clicking a table selects it for a new order.
 */
import { useQuery } from '@tanstack/react-query';
import api from '../../../api/axiosInstance';

const STATUS_STYLE = {
  available: { bg: 'bg-green-50  border-green-300', text: 'text-green-700',  dot: 'bg-green-400',  label: 'Available' },
  occupied:  { bg: 'bg-red-50    border-red-300',   text: 'text-red-700',    dot: 'bg-red-400',    label: 'Occupied'  },
  reserved:  { bg: 'bg-blue-50   border-blue-300',  text: 'text-blue-700',   dot: 'bg-blue-400',   label: 'Reserved'  },
  cleaning:  { bg: 'bg-gray-50   border-gray-300',  text: 'text-gray-600',   dot: 'bg-gray-400',   label: 'Cleaning'  },
};

export default function TableGrid({ restaurantId, selectedTableId, onSelectTable }) {
  const { data: tables = [], isLoading } = useQuery({
    queryKey: ['tables', restaurantId],
    queryFn:  () =>
      api.get('/menu/tables', { params: { restaurantId } }).then((r) => r.data.data),
    enabled: !!restaurantId,
    refetchInterval: 15_000,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-4 gap-3 p-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  // Group by section
  const sections = [...new Set(tables.map((t) => t.section || 'Main'))];

  return (
    <div className="overflow-y-auto p-4 space-y-6">
      {sections.map((section) => (
        <div key={section}>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{section}</h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {tables
              .filter((t) => (t.section || 'Main') === section)
              .map((table) => {
                const style    = STATUS_STYLE[table.status] || STATUS_STYLE.available;
                const isActive = table.id === selectedTableId;

                return (
                  <button
                    key={table.id}
                    onClick={() => onSelectTable(table)}
                    className={`relative flex flex-col items-center justify-center h-20 rounded-xl border-2 transition-all
                                ${style.bg} ${isActive ? 'ring-2 ring-brand-500 ring-offset-1 scale-105' : 'hover:scale-105'}`}
                  >
                    <span className={`text-lg font-bold ${style.text}`}>{table.name}</span>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className={`w-2 h-2 rounded-full ${style.dot}`} />
                      <span className={`text-xs ${style.text}`}>{style.label}</span>
                    </div>
                    <span className="text-xs text-gray-400 mt-0.5">
                      {table.capacity} seats
                    </span>
                  </button>
                );
              })}
          </div>
        </div>
      ))}
    </div>
  );
}
