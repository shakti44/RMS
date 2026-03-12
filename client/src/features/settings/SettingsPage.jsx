import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../api/axiosInstance';
import { useAuth } from '../../context/AuthContext';
import QRCode from 'qrcode.react';

export default function SettingsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState('profile');
  const restaurantId  = localStorage.getItem('restaurantId');

  // QR Code preview
  const qrUrl = `${window.location.origin}/${user?.tenantSlug}/menu?restaurant=${restaurantId}&table=SAMPLE`;

  return (
    <div className="p-4 md:p-6 space-y-6 pb-20 md:pb-6">
      <h1 className="text-xl font-bold text-gray-900">Settings</h1>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {['profile', 'tax', 'qr'].map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
              tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {t === 'qr' ? 'QR Codes' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'profile' && <ProfileForm />}
      {tab === 'tax'     && <TaxForm />}
      {tab === 'qr'      && <QRSection qrUrl={qrUrl} restaurantId={restaurantId} tenantSlug={user?.tenantSlug} />}
    </div>
  );
}

function ProfileForm() {
  const { user } = useAuth();
  const [form, setForm] = useState({ name: user?.tenantName || '', email: user?.email || '' });
  return (
    <div className="card p-6 max-w-lg space-y-4">
      <h2 className="text-sm font-semibold text-gray-800">Restaurant Profile</h2>
      {[['Restaurant Name', 'name', 'text'], ['Contact Email', 'email', 'email']].map(([label, key, type]) => (
        <div key={key}>
          <label className="text-xs text-gray-500 mb-1 block">{label}</label>
          <input type={type} className="input" value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
        </div>
      ))}
      <button className="btn-primary text-sm" onClick={() => toast.success('Saved (demo)')}>Save Changes</button>
    </div>
  );
}

function TaxForm() {
  const [cgst, setCgst] = useState('2.5');
  const [sgst, setSgst] = useState('2.5');
  return (
    <div className="card p-6 max-w-lg space-y-4">
      <h2 className="text-sm font-semibold text-gray-800">Tax Configuration</h2>
      <p className="text-xs text-gray-500">GST rates applied to all bills. Total = CGST + SGST.</p>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">CGST %</label>
          <input type="number" step="0.5" className="input" value={cgst} onChange={(e) => setCgst(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">SGST %</label>
          <input type="number" step="0.5" className="input" value={sgst} onChange={(e) => setSgst(e.target.value)} />
        </div>
      </div>
      <div className="bg-brand-50 rounded-xl p-3 text-sm text-brand-700">
        Effective GST on orders: <strong>{(Number(cgst) + Number(sgst)).toFixed(1)}%</strong>
      </div>
      <button className="btn-primary text-sm" onClick={() => toast.success('Tax settings saved (demo)')}>Save</button>
    </div>
  );
}

function QRSection({ qrUrl, restaurantId, tenantSlug }) {
  const [tableNum, setTableNum] = useState('1');
  const tableQrUrl = qrUrl.replace('SAMPLE', tableNum);

  const downloadQR = () => {
    const canvas = document.getElementById('qr-canvas');
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url; a.download = `table-${tableNum}-qr.png`; a.click();
  };

  return (
    <div className="card p-6 max-w-sm space-y-4">
      <h2 className="text-sm font-semibold text-gray-800">Generate Table QR Code</h2>
      <div>
        <label className="text-xs text-gray-500 mb-1 block">Table Number / Name</label>
        <input className="input" value={tableNum} onChange={(e) => setTableNum(e.target.value)} placeholder="e.g. T-1" />
      </div>
      <div className="flex justify-center p-4 bg-white border rounded-xl">
        <QRCode id="qr-canvas" value={tableQrUrl} size={180} renderAs="canvas" includeMargin />
      </div>
      <p className="text-xs text-gray-400 break-all">{tableQrUrl}</p>
      <button onClick={downloadQR} className="btn-primary text-sm w-full">Download PNG</button>
    </div>
  );
}
