import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { UtensilsCrossed } from 'lucide-react';
import api from '../../api/axiosInstance';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    restaurantName: '',
    ownerName: '',
    email: '',
    password: '',
    phone: '',
  });

  const slugify = (str) =>
    str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      const slug = slugify(form.restaurantName);
      await api.post('/auth/register-tenant', {
        tenantName:     form.restaurantName,
        restaurantName: form.restaurantName,
        slug,
        email:          form.email,
        password:       form.password,
      });
      toast.success('Restaurant registered! Please sign in.');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-500 to-orange-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-lg mb-4">
            <UtensilsCrossed className="w-8 h-8 text-brand-500" />
          </div>
          <h1 className="text-2xl font-bold text-white">Get Started Free</h1>
          <p className="text-orange-100 text-sm mt-1">Set up your restaurant in 60 seconds</p>
        </div>

        <div className="card p-6 space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Restaurant Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                className="input"
                placeholder="e.g. Spice Garden"
                value={form.restaurantName}
                onChange={set('restaurantName')}
              />
              {form.restaurantName && (
                <p className="text-xs text-gray-400 mt-1">
                  Your menu URL: <span className="font-mono text-brand-500">/{slugify(form.restaurantName)}/menu</span>
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Your Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                required
                className="input"
                placeholder="owner@restaurant.com"
                value={form.email}
                onChange={set('email')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                required
                minLength={6}
                className="input"
                placeholder="Min 6 characters"
                value={form.password}
                onChange={set('password')}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2.5 text-base"
            >
              {loading ? 'Creating your restaurant…' : 'Create My Restaurant →'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-500 font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>

        {/* What you get */}
        <div className="mt-6 grid grid-cols-3 gap-3 text-center">
          {[
            { icon: '📱', label: 'QR Menu' },
            { icon: '🖥️', label: 'POS System' },
            { icon: '👨‍🍳', label: 'Kitchen Display' },
          ].map(({ icon, label }) => (
            <div key={label} className="bg-white/20 rounded-xl p-3">
              <div className="text-2xl mb-1">{icon}</div>
              <div className="text-white text-xs font-medium">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
