import React, { useState, useEffect, useMemo, useCallback } from 'react';

// ============================================================
// SUPABASE CLIENT
// ============================================================
const SUPABASE_URL = "https://fhobsvxqpxferemvznvd.supabase.co";
const SUPABASE_KEY = "sb_publishable_S5uONlJII-zD5se4sRhyUg_14MI-dv0";

async function sb(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  if (!res.ok) throw new Error(`${path.split('?')[0]} -> ${res.status}: ${(await res.text()).slice(0, 150)}`);
  return res.json();
}

async function sbInsert(table, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${table} insert -> ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

async function sbUpdate(table, idColumn, idValue, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${idColumn}=eq.${idValue}`, {
    method: 'PATCH',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${table} update -> ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

async function sbDelete(table, idColumn, idValue) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${idColumn}=eq.${idValue}`, {
    method: 'DELETE',
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  if (!res.ok) throw new Error(`${table} delete -> ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return true;
}

// ============================================================
// STYLING & EVALUATION FORMULA
// ============================================================
const T = {
  bg: '#F4F3EF', surface: '#FFFFFF', ink: '#1A1D20', inkMuted: '#656D76',
  line: '#E1DFD7', accent: '#1C5B4E', accentSoft: '#E4F0EC',
  warn: '#B45309', warnSoft: '#FDF4E7', danger: '#B42318', dangerSoft: '#FCEBEA',
};

const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

function scoreVendors(rows) {
  if (!rows || !rows.length) return [];
  const prices = rows.map(r => r.price), days = rows.map(r => r.days);
  const minP = Math.min(...prices), maxP = Math.max(...prices);
  const minD = Math.min(...days), maxD = Math.max(...days);

  return rows.map(r => {
    const priceScore = maxP === minP ? 1 : 1 - (r.price - minP) / (maxP - minP);
    const deliveryScore = maxD === minD ? 1 : 1 - (r.days - minD) / (maxD - minD);
    const ratingScore = (r.rating || 0) / 5.0;
    const score = 0.5 * priceScore + 0.2 * deliveryScore + 0.3 * ratingScore;
    return { ...r, score };
  }).sort((a, b) => b.score - a.score);
}

// ============================================================
// SHARED UI COMPONENTS
// ============================================================
function StatusBadge({ status }) {
  const map = {
    Approved: { fg: T.accent, bg: T.accentSoft }, Verified: { fg: T.accent, bg: T.accentSoft },
    Delivered: { fg: T.accent, bg: T.accentSoft }, Completed: { fg: T.accent, bg: T.accentSoft },
    Passed: { fg: T.accent, bg: T.accentSoft }, Paid: { fg: T.accent, bg: T.accentSoft },
    Pending: { fg: T.warn, bg: T.warnSoft }, Issued: { fg: T.warn, bg: T.warnSoft },
    Delayed: { fg: T.warn, bg: T.warnSoft }, 'Partially Accepted': { fg: T.warn, bg: T.warnSoft },
    Rejected: { fg: T.danger, bg: T.dangerSoft }, Failed: { fg: T.danger, bg: T.dangerSoft },
    Disputed: { fg: T.danger, bg: T.dangerSoft }, Cancelled: { fg: T.danger, bg: T.dangerSoft },
  };
  const s = map[status] || map.Pending;
  return (
    <span style={{ borderRadius: 999, padding: '4px 10px', fontSize: 12, fontWeight: 600, color: s.fg, background: s.bg, display: 'inline-block' }}>
      {status || '-'}
    </span>
  );
}

function Card({ children, style }) {
  return <div style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: 10, padding: 20, ...style }}>{children}</div>;
}

function KPI({ label, value, sub }) {
  return (
    <Card>
      <div style={{ fontSize: 11, fontWeight: 600, color: T.inkMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
      <div style={{ marginTop: 8, fontSize: 26, fontFamily: 'monospace', color: T.ink, fontWeight: 700 }}>{value}</div>
      {sub && <div style={{ marginTop: 4, fontSize: 12, color: T.inkMuted }}>{sub}</div>}
    </Card>
  );
}

const STAGES = ['Request', 'Approval', 'RFQ', 'Quotation', 'Evaluation', 'Purchase Order', 'Delivery', 'Inspection', 'Distribution', 'Payment'];

function Pipeline({ current }) {
  return (
    <Card>
      <div style={{ fontSize: 14, fontWeight: 600, color: T.ink, marginBottom: 16 }}>Procurement Lifecycle Workflow Pipeline</div>
      <div style={{ display: 'flex', alignItems: 'center', overflowX: 'auto', paddingBottom: 6 }}>
        {STAGES.map((stage, i) => {
          const done = i < current, active = i === current;
          return (
            <div key={stage} style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 85 }}>
                <div style={{
                  width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: done || active ? T.accent : T.bg, border: `1.5px solid ${done || active ? T.accent : T.line}`,
                  color: done || active ? '#fff' : T.inkMuted, fontSize: 11, fontFamily: 'monospace', fontWeight: 600,
                }}>{done ? '✓' : i + 1}</div>
                <div style={{ marginTop: 6, textAlign: 'center', fontSize: 11, color: done || active ? T.ink : T.inkMuted, fontWeight: active ? 600 : 400 }}>{stage}</div>
              </div>
              {i < STAGES.length - 1 && <div style={{ height: 2, width: 20, background: done ? T.accent : T.line, marginBottom: 20 }} />}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function VendorScorecard({ quotations }) {
  const ranked = useMemo(() => scoreVendors(quotations), [quotations]);
  if (!ranked.length) return <Card><div style={{ fontSize: 13, color: T.inkMuted }}>No quotations submitted for scoring.</div></Card>;
  return (
    <Card>
      <div style={{ fontSize: 14, fontWeight: 600, color: T.ink, marginBottom: 2 }}>Vendor Scorecard (Relative Normalization)</div>
      <div style={{ fontSize: 12, color: T.inkMuted, marginBottom: 16 }}>Formula: 0.5 × Price + 0.2 × Delivery + 0.3 × Rating</div>
      {ranked.map((v, i) => (
        <div key={v.quotation_id || i} style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 6 }}>
            <span style={{ color: T.ink, fontWeight: i === 0 ? 600 : 400 }}>
              {i === 0 && <span style={{ marginRight: 8, borderRadius: 999, padding: '2px 8px', fontSize: 10, fontWeight: 600, background: T.accentSoft, color: T.accent }}>BEST MATCH</span>}
              {v.vendor}
            </span>
            <span style={{ fontFamily: 'monospace', fontWeight: 600, color: i === 0 ? T.accent : T.inkMuted }}>{(v.score * 100).toFixed(1)}/100</span>
          </div>
          <div style={{ height: 8, borderRadius: 999, background: T.bg, overflow: 'hidden' }}>
            <div style={{ width: `${Math.max(v.score * 100, 5)}%`, height: '100%', background: i === 0 ? T.accent : '#C7C2B8', transition: 'width 0.4s ease' }} />
          </div>
          <div style={{ marginTop: 6, display: 'flex', gap: 16, fontSize: 12, color: T.inkMuted, fontFamily: 'monospace' }}>
            <span>{money(v.price)}</span><span>{v.days}d delivery</span><span>★ {v.rating ? Number(v.rating).toFixed(1) : 'Unrated'}</span>
          </div>
        </div>
      ))}
    </Card>
  );
}

function Table({ columns, rows, empty }) {
  if (!rows.length) return <Card><div style={{ textAlign: 'center', fontSize: 13, color: T.inkMuted, padding: '12px 0' }}>{empty || 'No records found.'}</div></Card>;
  return (
    <div style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: 10, overflow: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead><tr style={{ borderBottom: `1px solid ${T.line}`, background: '#FAF9F5' }}>
          {columns.map(c => <th key={c} style={{ textAlign: 'left', padding: '12px 16px', fontSize: 11, fontWeight: 600, color: T.inkMuted, textTransform: 'uppercase' }}>{c}</th>)}
        </tr></thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ borderBottom: i < rows.length - 1 ? `1px solid ${T.line}` : 'none' }}>
              {row.map((cell, j) => <td key={j} style={{ padding: '12px 16px', color: T.ink, whiteSpace: 'nowrap' }}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(23,27,33,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }} onClick={onClose}>
      <div style={{ background: T.surface, borderRadius: 12, padding: 24, width: 450, maxWidth: '92vw', maxHeight: '88vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: T.ink }}>{title}</div>
          <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: 18, cursor: 'pointer', color: T.inkMuted }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

const inputStyle = { width: '100%', padding: '9px 11px', borderRadius: 6, border: `1px solid ${T.line}`, fontSize: 13, marginBottom: 12, boxSizing: 'border-box', fontFamily: 'inherit' };
const labelStyle = { fontSize: 12, color: T.inkMuted, marginBottom: 4, display: 'block', fontWeight: 500 };
const btnStyle = { width: '100%', padding: '10px 0', borderRadius: 6, border: 'none', background: T.accent, color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer' };
const smallBtn = { padding: '5px 10px', borderRadius: 5, border: `1px solid ${T.line}`, background: T.surface, fontSize: 12, cursor: 'pointer', marginRight: 6 };
const smallBtnDanger = { ...smallBtn, color: T.danger, borderColor: T.danger };
const smallBtnAccent = { ...smallBtn, color: T.accent, borderColor: T.accent };

// ============================================================
// DUAL LOGIN SCREEN (EMPLOYEE & VENDOR PORTAL)
// ============================================================
function LoginPage({ employees, vendors, onEmployeeLogin, onVendorLogin }) {
  const [tab, setTab] = useState('employee'); // 'employee' or 'vendor'
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    if (tab === 'employee') {
      const found = employees.find(emp => emp.email.toLowerCase().trim() === email.toLowerCase().trim());
      if (found) onEmployeeLogin(found);
      else setError('Employee Email not found in database.');
    } else {
      const found = vendors.find(v => v.email?.toLowerCase().trim() === email.toLowerCase().trim() || v.vendor_name.toLowerCase().includes(email.toLowerCase().trim()));
      if (found) onVendorLogin(found);
      else setError('Vendor not found in database.');
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: 14, padding: 32, width: 450, maxWidth: '95vw', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: T.accent, letterSpacing: 0.5 }}>ProcureX</div>
          <div style={{ fontSize: 13, color: T.inkMuted, marginTop: 4 }}>Smart Procurement & Vendor Management System</div>
          <div style={{ fontSize: 11, color: T.accent, fontWeight: 600, marginTop: 2 }}>Dual Authentication & Role-Based Access Portal</div>
        </div>

        {/* TAB SWITCHER: EMPLOYEE VS VENDOR */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${T.line}`, marginBottom: 20 }}>
          <button onClick={() => { setTab('employee'); setError(''); }} style={{ flex: 1, padding: '10px 0', border: 'none', background: 'none', borderBottom: tab === 'employee' ? `2px solid ${T.accent}` : 'none', color: tab === 'employee' ? T.accent : T.inkMuted, fontWeight: tab === 'employee' ? 600 : 400, cursor: 'pointer', fontSize: 13 }}>
            Internal Employee Portal
          </button>
          <button onClick={() => { setTab('vendor'); setError(''); }} style={{ flex: 1, padding: '10px 0', border: 'none', background: 'none', borderBottom: tab === 'vendor' ? `2px solid ${T.accent}` : 'none', color: tab === 'vendor' ? T.accent : T.inkMuted, fontWeight: tab === 'vendor' ? 600 : 400, cursor: 'pointer', fontSize: 13 }}>
            External Vendor Portal
          </button>
        </div>

        {error && <div style={{ background: T.dangerSoft, color: T.danger, fontSize: 12, padding: 10, borderRadius: 6, marginBottom: 16 }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <label style={labelStyle}>{tab === 'employee' ? 'Corporate Email Address' : 'Vendor Email / Name'}</label>
          <input style={inputStyle} required placeholder={tab === 'employee' ? "e.g. rohan.shah@technova.com" : "e.g. contact@alphatraders.com"} value={email} onChange={e => setEmail(e.target.value)} />
          <button style={btnStyle}>{tab === 'employee' ? 'Login as Employee' : 'Login as Vendor'}</button>
        </form>

        <div style={{ marginTop: 24, paddingTop: 18, borderTop: `1px solid ${T.line}` }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: T.inkMuted, textTransform: 'uppercase', marginBottom: 10 }}>Quick Demo Profiles:</div>
          {tab === 'employee' ? (
            employees.map(emp => (
              <div key={emp.employee_id} onClick={() => onEmployeeLogin(emp)} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', marginBottom: 6,
                borderRadius: 6, background: T.bg, cursor: 'pointer', border: `1px solid ${T.line}`, fontSize: 12,
              }}>
                <div><strong>{emp.name}</strong> <span style={{ color: T.inkMuted }}>({emp.email})</span></div>
                <span style={{ fontSize: 10, background: T.accentSoft, color: T.accent, padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>{emp.role?.role_name}</span>
              </div>
            ))
          ) : (
            vendors.map(v => (
              <div key={v.vendor_id} onClick={() => onVendorLogin(v)} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', marginBottom: 6,
                borderRadius: 6, background: T.bg, cursor: 'pointer', border: `1px solid ${T.line}`, fontSize: 12,
              }}>
                <div><strong>{v.vendor_name}</strong> <span style={{ color: T.inkMuted }}>({v.email || 'Vendor Account'})</span></div>
                <span style={{ fontSize: 10, background: T.warnSoft, color: T.warn, padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>★ {v.rating || 'Unrated'}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// FORMS FOR ENTITY CREATION
// ============================================================
function DepartmentForm({ corporationId, onDone }) {
  const [name, setName] = useState(''); const [saving, setSaving] = useState(false); const [err, setErr] = useState(null);
  async function submit(e) {
    e.preventDefault(); setSaving(true); setErr(null);
    try { await sbInsert('department', { company_id: corporationId || 1, department_name: name }); onDone(); }
    catch (e2) { setErr(e2.message); } finally { setSaving(false); }
  }
  return (
    <form onSubmit={submit}>
      {err && <div style={{ background: T.dangerSoft, color: T.danger, fontSize: 12, padding: 8, borderRadius: 6, marginBottom: 12 }}>{err}</div>}
      <label style={labelStyle}>Department Name</label>
      <input style={inputStyle} required placeholder="e.g. Logistics, HR" value={name} onChange={e => setName(e.target.value)} />
      <button style={btnStyle} disabled={saving}>{saving ? 'Creating...' : 'Create Department'}</button>
    </form>
  );
}

function RoleForm({ onDone }) {
  const [name, setName] = useState(''); const [saving, setSaving] = useState(false); const [err, setErr] = useState(null);
  async function submit(e) {
    e.preventDefault(); setSaving(true); setErr(null);
    try { await sbInsert('role', { role_name: name }); onDone(); }
    catch (e2) { setErr(e2.message); } finally { setSaving(false); }
  }
  return (
    <form onSubmit={submit}>
      {err && <div style={{ background: T.dangerSoft, color: T.danger, fontSize: 12, padding: 8, borderRadius: 6, marginBottom: 12 }}>{err}</div>}
      <label style={labelStyle}>Role Name</label>
      <input style={inputStyle} required placeholder="e.g. Auditor, Inspector" value={name} onChange={e => setName(e.target.value)} />
      <button style={btnStyle} disabled={saving}>{saving ? 'Creating...' : 'Create Role'}</button>
    </form>
  );
}

function EmployeeForm({ departments, roles, onDone }) {
  const [form, setForm] = useState({ name: '', email: '', department_id: departments[0]?.department_id || '', role_id: roles[0]?.role_id || '' });
  const [saving, setSaving] = useState(false); const [err, setErr] = useState(null);

  async function submit(e) {
    e.preventDefault(); setSaving(true); setErr(null);
    try {
      await sbInsert('employee', { name: form.name, email: form.email, department_id: Number(form.department_id), role_id: Number(form.role_id) });
      onDone();
    } catch (e2) { setErr(e2.message); } finally { setSaving(false); }
  }
  return (
    <form onSubmit={submit}>
      {err && <div style={{ background: T.dangerSoft, color: T.danger, fontSize: 12, padding: 8, borderRadius: 6, marginBottom: 12 }}>{err}</div>}
      <label style={labelStyle}>Employee Name</label>
      <input style={inputStyle} required placeholder="Full Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
      <label style={labelStyle}>Corporate Email</label>
      <input style={inputStyle} type="email" required placeholder="name@technova.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
      <label style={labelStyle}>Department</label>
      <select style={inputStyle} required value={form.department_id} onChange={e => setForm({ ...form, department_id: e.target.value })}>
        <option value="">Select Department...</option>
        {departments.map(d => <option key={d.department_id} value={d.department_id}>{d.department_name}</option>)}
      </select>
      <label style={labelStyle}>Role</label>
      <select style={inputStyle} required value={form.role_id} onChange={e => setForm({ ...form, role_id: e.target.value })}>
        <option value="">Select Role...</option>
        {roles.map(r => <option key={r.role_id} value={r.role_id}>{r.role_name}</option>)}
      </select>
      <button style={btnStyle} disabled={saving}>{saving ? 'Creating...' : 'Create Employee'}</button>
    </form>
  );
}

function ProductForm({ onDone }) {
  const [form, setForm] = useState({ product_name: '', category: 'Electronics', unit: 'piece' });
  const [saving, setSaving] = useState(false); const [err, setErr] = useState(null);
  async function submit(e) {
    e.preventDefault(); setSaving(true); setErr(null);
    try { await sbInsert('product', form); onDone(); }
    catch (e2) { setErr(e2.message); } finally { setSaving(false); }
  }
  return (
    <form onSubmit={submit}>
      {err && <div style={{ background: T.dangerSoft, color: T.danger, fontSize: 12, padding: 8, borderRadius: 6, marginBottom: 12 }}>{err}</div>}
      <label style={labelStyle}>Product Name</label>
      <input style={inputStyle} required placeholder="e.g. Ergonomic Desk" value={form.product_name} onChange={e => setForm({ ...form, product_name: e.target.value })} />
      <label style={labelStyle}>Category</label>
      <input style={inputStyle} required placeholder="e.g. Hardware, Furniture" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} />
      <label style={labelStyle}>Unit</label>
      <input style={inputStyle} required placeholder="e.g. piece, ream, box" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} />
      <button style={btnStyle} disabled={saving}>{saving ? 'Adding...' : 'Add Product'}</button>
    </form>
  );
}

function VendorForm({ existing, onDone }) {
  const [form, setForm] = useState(existing
    ? { vendor_name: existing.vendor_name || '', email: existing.email || '', phone: existing.phone || '', address: existing.address || '', gst_no: existing.gst_no || '' }
    : { vendor_name: '', email: '', phone: '', address: '', gst_no: '' });
  const [saving, setSaving] = useState(false); const [err, setErr] = useState(null);
  async function submit(e) {
    e.preventDefault(); setSaving(true); setErr(null);
    try {
      if (existing) await sbUpdate('vendor', 'vendor_id', existing.vendor_id, form);
      else await sbInsert('vendor', form);
      onDone();
    } catch (e2) { setErr(e2.message); } finally { setSaving(false); }
  }
  return (
    <form onSubmit={submit}>
      {err && <div style={{ background: T.dangerSoft, color: T.danger, fontSize: 12, padding: 8, borderRadius: 6, marginBottom: 12 }}>{err}</div>}
      <label style={labelStyle}>Vendor Name</label><input style={inputStyle} required value={form.vendor_name} onChange={e => setForm({ ...form, vendor_name: e.target.value })} />
      <label style={labelStyle}>Email</label><input style={inputStyle} type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
      <label style={labelStyle}>Phone</label><input style={inputStyle} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
      <label style={labelStyle}>Address</label><input style={inputStyle} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
      <label style={labelStyle}>GST No</label><input style={inputStyle} value={form.gst_no} onChange={e => setForm({ ...form, gst_no: e.target.value })} />
      <button style={btnStyle} disabled={saving}>{saving ? 'Saving...' : 'Save Vendor'}</button>
    </form>
  );
}

function RateVendorForm({ vendor, onDone }) {
  const [score, setScore] = useState(4.5); const [saving, setSaving] = useState(false); const [err, setErr] = useState(null);
  async function submit(e) {
    e.preventDefault(); setSaving(true); setErr(null);
    try {
      await sbInsert('vendor_rating', { vendor_id: vendor.vendor_id, rating_score: Number(score), rating_date: new Date().toISOString().split('T')[0] });
      onDone();
    } catch (e2) { setErr(e2.message); } finally { setSaving(false); }
  }
  return (
    <form onSubmit={submit}>
      {err && <div style={{ background: T.dangerSoft, color: T.danger, fontSize: 12, padding: 8, borderRadius: 6, marginBottom: 12 }}>{err}</div>}
      <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 12 }}>Vendor: <strong>{vendor?.vendor_name}</strong></div>
      <label style={labelStyle}>Rating Score (0.0 to 5.0)</label>
      <input style={inputStyle} type="number" step="0.1" min="0" max="5" required value={score} onChange={e => setScore(e.target.value)} />
      <button style={btnStyle} disabled={saving}>{saving ? 'Submitting...' : 'Submit Rating'}</button>
    </form>
  );
}

function RequestForm({ currentUser, employees, departments, products, onDone }) {
  const [form, setForm] = useState({ requestor_id: currentUser?.employee_id || employees[0]?.employee_id || '', department_id: currentUser?.department_id || departments[0]?.department_id || '', product_id: products[0]?.product_id || '', quantity: 1, required_date: '' });
  const [saving, setSaving] = useState(false); const [err, setErr] = useState(null);

  async function submit(e) {
    e.preventDefault(); setSaving(true); setErr(null);
    try {
      const [pr] = await sbInsert('purchase_request', {
        requestor_id: Number(form.requestor_id), department_id: Number(form.department_id), approval_status: 'Pending',
      });
      if (form.product_id && pr) {
        await sbInsert('purchase_request_item', {
          pr_id: pr.pr_id, product_id: Number(form.product_id), quantity: Number(form.quantity) || 1, required_date: form.required_date || null,
        });
      }
      onDone();
    } catch (e2) { setErr(e2.message); } finally { setSaving(false); }
  }

  return (
    <form onSubmit={submit}>
      {err && <div style={{ background: T.dangerSoft, color: T.danger, fontSize: 12, padding: 8, borderRadius: 6, marginBottom: 12 }}>{err}</div>}
      <label style={labelStyle}>Requestor Employee</label>
      <select style={inputStyle} required value={form.requestor_id} onChange={e => setForm({ ...form, requestor_id: e.target.value })}>
        <option value="">Select Employee...</option>
        {employees.map(e => <option key={e.employee_id} value={e.employee_id}>{e.name} ({e.department?.department_name})</option>)}
      </select>
      <label style={labelStyle}>Department</label>
      <select style={inputStyle} required value={form.department_id} onChange={e => setForm({ ...form, department_id: e.target.value })}>
        <option value="">Select Department...</option>
        {departments.map(d => <option key={d.department_id} value={d.department_id}>{d.department_name}</option>)}
      </select>
      <label style={labelStyle}>Requested Product</label>
      <select style={inputStyle} required value={form.product_id} onChange={e => setForm({ ...form, product_id: e.target.value })}>
        <option value="">Select Product...</option>
        {products.map(p => <option key={p.product_id} value={p.product_id}>{p.product_name} ({p.unit})</option>)}
      </select>
      <label style={labelStyle}>Quantity</label>
      <input style={inputStyle} type="number" min="1" required value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} />
      <label style={labelStyle}>Required Date</label>
      <input style={inputStyle} type="date" value={form.required_date} onChange={e => setForm({ ...form, required_date: e.target.value })} />
      <button style={btnStyle} disabled={saving}>{saving ? 'Creating...' : 'Create Purchase Request'}</button>
    </form>
  );
}

function IssueRFQForm({ approvedPRs, officers, vendors, onDone }) {
  const [form, setForm] = useState({ pr_id: approvedPRs[0]?.pr_id || '', officer_id: officers[0]?.employee_id || '', due_date: '', selectedVendors: [] });
  const [saving, setSaving] = useState(false); const [err, setErr] = useState(null);

  async function submit(e) {
    e.preventDefault(); setSaving(true); setErr(null);
    try {
      const [rfq] = await sbInsert('rfq', {
        pr_id: Number(form.pr_id),
        procurement_officer_id: Number(form.officer_id),
        issue_date: new Date().toISOString().split('T')[0],
        due_date: form.due_date || null,
      });
      if (rfq && form.selectedVendors.length) {
        for (const vId of form.selectedVendors) {
          await sbInsert('rfq_vendor', { rfq_id: rfq.rfq_id, vendor_id: Number(vId) });
        }
      }
      onDone();
    } catch (e2) { setErr(e2.message); } finally { setSaving(false); }
  }

  return (
    <form onSubmit={submit}>
      {err && <div style={{ background: T.dangerSoft, color: T.danger, fontSize: 12, padding: 8, borderRadius: 6, marginBottom: 12 }}>{err}</div>}
      <label style={labelStyle}>Approved Purchase Request</label>
      <select style={inputStyle} required value={form.pr_id} onChange={e => setForm({ ...form, pr_id: e.target.value })}>
        <option value="">Select Approved PR...</option>
        {approvedPRs.map(pr => <option key={pr.pr_id} value={pr.pr_id}>PR-{String(pr.pr_id).padStart(4, '0')} ({pr.department?.department_name})</option>)}
      </select>
      <label style={labelStyle}>Procurement Officer</label>
      <select style={inputStyle} required value={form.officer_id} onChange={e => setForm({ ...form, officer_id: e.target.value })}>
        <option value="">Select Officer...</option>
        {officers.map(o => <option key={o.employee_id} value={o.employee_id}>{o.name}</option>)}
      </select>
      <label style={labelStyle}>RFQ Due Date</label>
      <input style={inputStyle} type="date" required value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} />
      <label style={labelStyle}>Invite Vendors (RFQ_VENDOR)</label>
      <div style={{ maxHeight: 120, overflowY: 'auto', border: `1px solid ${T.line}`, borderRadius: 6, padding: 8, marginBottom: 12 }}>
        {vendors.map(v => (
          <label key={v.vendor_id} style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>
            <input type="checkbox" value={v.vendor_id} onChange={e => {
              const id = Number(e.target.value);
              setForm(f => ({ ...f, selectedVendors: e.target.checked ? [...f.selectedVendors, id] : f.selectedVendors.filter(x => x !== id) }));
            }} /> {v.vendor_name}
          </label>
        ))}
      </div>
      <button style={btnStyle} disabled={saving}>{saving ? 'Issuing...' : 'Issue RFQ'}</button>
    </form>
  );
}

function QuotationForm({ defaultVendorId, rfqList, vendors, onDone }) {
  const [form, setForm] = useState({ rfq_id: rfqList[0]?.rfq_id || '', vendor_id: defaultVendorId || vendors[0]?.vendor_id || '', quoted_price: '', delivery_days: '' });
  const [saving, setSaving] = useState(false); const [err, setErr] = useState(null);

  async function submit(e) {
    e.preventDefault(); setSaving(true); setErr(null);
    try {
      await sbInsert('quotation', {
        rfq_id: Number(form.rfq_id), vendor_id: Number(form.vendor_id), quoted_price: Number(form.quoted_price), delivery_days: Number(form.delivery_days),
      });
      onDone();
    } catch (e2) { setErr(e2.message); } finally { setSaving(false); }
  }

  return (
    <form onSubmit={submit}>
      {err && <div style={{ background: T.dangerSoft, color: T.danger, fontSize: 12, padding: 8, borderRadius: 6, marginBottom: 12 }}>{err}</div>}
      <label style={labelStyle}>Target RFQ</label>
      <select style={inputStyle} required value={form.rfq_id} onChange={e => setForm({ ...form, rfq_id: e.target.value })}>
        <option value="">Select RFQ...</option>
        {rfqList.map(r => <option key={r.rfq_id} value={r.rfq_id}>RFQ-{String(r.rfq_id).padStart(4, '0')}</option>)}
      </select>
      <label style={labelStyle}>Vendor</label>
      <select style={inputStyle} required value={form.vendor_id} disabled={!!defaultVendorId} onChange={e => setForm({ ...form, vendor_id: e.target.value })}>
        <option value="">Select Vendor...</option>
        {vendors.map(v => <option key={v.vendor_id} value={v.vendor_id}>{v.vendor_name}</option>)}
      </select>
      <label style={labelStyle}>Quoted Price (₹)</label>
      <input style={inputStyle} type="number" required min="0" value={form.quoted_price} onChange={e => setForm({ ...form, quoted_price: e.target.value })} />
      <label style={labelStyle}>Delivery Days</label>
      <input style={inputStyle} type="number" required min="1" value={form.delivery_days} onChange={e => setForm({ ...form, delivery_days: e.target.value })} />
      <button style={btnStyle} disabled={saving}>{saving ? 'Submitting...' : 'Submit Quotation'}</button>
    </form>
  );
}

function IssuePOForm({ quotations, officers, onDone }) {
  const [form, setForm] = useState({ quotation_id: quotations[0]?.quotation_id || '', officer_id: officers[0]?.employee_id || '' });
  const [saving, setSaving] = useState(false); const [err, setErr] = useState(null);

  async function submit(e) {
    e.preventDefault(); setSaving(true); setErr(null);
    try {
      const selQuote = quotations.find(q => q.quotation_id === Number(form.quotation_id));
      await sbInsert('purchase_order', {
        quotation_id: Number(form.quotation_id),
        procurement_officer_id: Number(form.officer_id),
        po_date: new Date().toISOString().split('T')[0],
        total_amount: selQuote ? selQuote.price : 0,
        po_status: 'Issued',
      });
      onDone();
    } catch (e2) { setErr(e2.message); } finally { setSaving(false); }
  }

  return (
    <form onSubmit={submit}>
      {err && <div style={{ background: T.dangerSoft, color: T.danger, fontSize: 12, padding: 8, borderRadius: 6, marginBottom: 12 }}>{err}</div>}
      <label style={labelStyle}>Select Evaluated Quotation</label>
      <select style={inputStyle} required value={form.quotation_id} onChange={e => setForm({ ...form, quotation_id: e.target.value })}>
        <option value="">Select Quotation...</option>
        {quotations.map(q => <option key={q.quotation_id} value={q.quotation_id}>Quote-{q.quotation_id}: {q.vendor} ({money(q.price)})</option>)}
      </select>
      <label style={labelStyle}>Procurement Officer</label>
      <select style={inputStyle} required value={form.officer_id} onChange={e => setForm({ ...form, officer_id: e.target.value })}>
        <option value="">Select Officer...</option>
        {officers.map(o => <option key={o.employee_id} value={o.employee_id}>{o.name}</option>)}
      </select>
      <button style={btnStyle} disabled={saving}>{saving ? 'Issuing...' : 'Generate Purchase Order'}</button>
    </form>
  );
}

function DeliveryForm({ orders, onDone }) {
  const [form, setForm] = useState({ po_id: orders[0]?.po_id || '', delivery_date: new Date().toISOString().split('T')[0], delivery_status: 'Pending' });
  const [saving, setSaving] = useState(false); const [err, setErr] = useState(null);

  async function submit(e) {
    e.preventDefault(); setSaving(true); setErr(null);
    try {
      await sbInsert('delivery', { po_id: Number(form.po_id), delivery_date: form.delivery_date, delivery_status: form.delivery_status });
      onDone();
    } catch (e2) { setErr(e2.message); } finally { setSaving(false); }
  }

  return (
    <form onSubmit={submit}>
      {err && <div style={{ background: T.dangerSoft, color: T.danger, fontSize: 12, padding: 8, borderRadius: 6, marginBottom: 12 }}>{err}</div>}
      <label style={labelStyle}>Purchase Order</label>
      <select style={inputStyle} required value={form.po_id} onChange={e => setForm({ ...form, po_id: e.target.value })}>
        <option value="">Select PO...</option>
        {orders.map(o => <option key={o.po_id} value={o.po_id}>PO-{String(o.po_id).padStart(4, '0')} ({money(o.total_amount)})</option>)}
      </select>
      <label style={labelStyle}>Delivery Date</label>
      <input style={inputStyle} type="date" required value={form.delivery_date} onChange={e => setForm({ ...form, delivery_date: e.target.value })} />
      <label style={labelStyle}>Delivery Status</label>
      <select style={inputStyle} value={form.delivery_status} onChange={e => setForm({ ...form, delivery_status: e.target.value })}>
        <option value="Pending">Pending</option><option value="Delivered">Delivered</option><option value="Delayed">Delayed</option>
      </select>
      <button style={btnStyle} disabled={saving}>{saving ? 'Logging...' : 'Log Delivery'}</button>
    </form>
  );
}

function QCForm({ deliveries, employees, onDone }) {
  const [form, setForm] = useState({ delivery_id: deliveries[0]?.delivery_id || '', inspector_id: employees[0]?.employee_id || '', result: 'Passed' });
  const [saving, setSaving] = useState(false); const [err, setErr] = useState(null);

  async function submit(e) {
    e.preventDefault(); setSaving(true); setErr(null);
    try {
      await sbInsert('quality_inspection', {
        delivery_id: Number(form.delivery_id), inspector_id: Number(form.inspector_id), inspection_date: new Date().toISOString().split('T')[0], result: form.result,
      });
      onDone();
    } catch (e2) { setErr(e2.message); } finally { setSaving(false); }
  }

  return (
    <form onSubmit={submit}>
      {err && <div style={{ background: T.dangerSoft, color: T.danger, fontSize: 12, padding: 8, borderRadius: 6, marginBottom: 12 }}>{err}</div>}
      <label style={labelStyle}>Select Delivery</label>
      <select style={inputStyle} required value={form.delivery_id} onChange={e => setForm({ ...form, delivery_id: e.target.value })}>
        <option value="">Select Delivery...</option>
        {deliveries.map(d => <option key={d.delivery_id} value={d.delivery_id}>DL-{String(d.delivery_id).padStart(4, '0')} (PO-{d.po_id})</option>)}
      </select>
      <label style={labelStyle}>Inspector Employee</label>
      <select style={inputStyle} required value={form.inspector_id} onChange={e => setForm({ ...form, inspector_id: e.target.value })}>
        <option value="">Select Inspector...</option>
        {employees.map(e => <option key={e.employee_id} value={e.employee_id}>{e.name}</option>)}
      </select>
      <label style={labelStyle}>Inspection Result</label>
      <select style={inputStyle} value={form.result} onChange={e => setForm({ ...form, result: e.target.value })}>
        <option value="Passed">Passed</option><option value="Failed">Failed</option><option value="Partially Accepted">Partially Accepted</option>
      </select>
      <button style={btnStyle} disabled={saving}>{saving ? 'Saving...' : 'Record Inspection'}</button>
    </form>
  );
}

function DistributionForm({ deliveries, departments, employees, onDone }) {
  const [form, setForm] = useState({ delivery_id: deliveries[0]?.delivery_id || '', department_id: departments[0]?.department_id || '', received_by: employees[0]?.employee_id || '' });
  const [saving, setSaving] = useState(false); const [err, setErr] = useState(null);

  async function submit(e) {
    e.preventDefault(); setSaving(true); setErr(null);
    try {
      await sbInsert('distribution', {
        delivery_id: Number(form.delivery_id), department_id: Number(form.department_id), distributed_date: new Date().toISOString().split('T')[0], received_by: Number(form.received_by),
      });
      onDone();
    } catch (e2) { setErr(e2.message); } finally { setSaving(false); }
  }

  return (
    <form onSubmit={submit}>
      {err && <div style={{ background: T.dangerSoft, color: T.danger, fontSize: 12, padding: 8, borderRadius: 6, marginBottom: 12 }}>{err}</div>}
      <label style={labelStyle}>Select Delivery</label>
      <select style={inputStyle} required value={form.delivery_id} onChange={e => setForm({ ...form, delivery_id: e.target.value })}>
        <option value="">Select Delivery...</option>
        {deliveries.map(d => <option key={d.delivery_id} value={d.delivery_id}>DL-{String(d.delivery_id).padStart(4, '0')}</option>)}
      </select>
      <label style={labelStyle}>Receiving Department</label>
      <select style={inputStyle} required value={form.department_id} onChange={e => setForm({ ...form, department_id: e.target.value })}>
        <option value="">Select Department...</option>
        {departments.map(d => <option key={d.department_id} value={d.department_id}>{d.department_name}</option>)}
      </select>
      <label style={labelStyle}>Received By Employee</label>
      <select style={inputStyle} required value={form.received_by} onChange={e => setForm({ ...form, received_by: e.target.value })}>
        <option value="">Select Employee...</option>
        {employees.map(e => <option key={e.employee_id} value={e.employee_id}>{e.name}</option>)}
      </select>
      <button style={btnStyle} disabled={saving}>{saving ? 'Saving...' : 'Log Distribution'}</button>
    </form>
  );
}

function InvoiceForm({ orders, vendors, onDone }) {
  const [form, setForm] = useState({ po_id: orders[0]?.po_id || '', vendor_id: vendors[0]?.vendor_id || '', invoice_amount: '' });
  const [saving, setSaving] = useState(false); const [err, setErr] = useState(null);

  async function submit(e) {
    e.preventDefault(); setSaving(true); setErr(null);
    try {
      await sbInsert('invoice', {
        po_id: Number(form.po_id), vendor_id: Number(form.vendor_id), invoice_amount: Number(form.invoice_amount), invoice_date: new Date().toISOString().split('T')[0], verification_status: 'Pending',
      });
      onDone();
    } catch (e2) { setErr(e2.message); } finally { setSaving(false); }
  }

  return (
    <form onSubmit={submit}>
      {err && <div style={{ background: T.dangerSoft, color: T.danger, fontSize: 12, padding: 8, borderRadius: 6, marginBottom: 12 }}>{err}</div>}
      <label style={labelStyle}>Purchase Order</label>
      <select style={inputStyle} required value={form.po_id} onChange={e => setForm({ ...form, po_id: e.target.value })}>
        <option value="">Select PO...</option>
        {orders.map(o => <option key={o.po_id} value={o.po_id}>PO-{String(o.po_id).padStart(4, '0')}</option>)}
      </select>
      <label style={labelStyle}>Vendor</label>
      <select style={inputStyle} required value={form.vendor_id} onChange={e => setForm({ ...form, vendor_id: e.target.value })}>
        <option value="">Select Vendor...</option>
        {vendors.map(v => <option key={v.vendor_id} value={v.vendor_id}>{v.vendor_name}</option>)}
      </select>
      <label style={labelStyle}>Invoice Amount (₹)</label>
      <input style={inputStyle} type="number" required min="0" value={form.invoice_amount} onChange={e => setForm({ ...form, invoice_amount: e.target.value })} />
      <button style={btnStyle} disabled={saving}>{saving ? 'Generating...' : 'Issue Invoice'}</button>
    </form>
  );
}

function PaymentForm({ invoices, onDone }) {
  const [form, setForm] = useState({ invoice_id: invoices[0]?.invoice_id || '', amount_paid: '', payment_status: 'Paid' });
  const [saving, setSaving] = useState(false); const [err, setErr] = useState(null);

  async function submit(e) {
    e.preventDefault(); setSaving(true); setErr(null);
    try {
      await sbInsert('payment', {
        invoice_id: Number(form.invoice_id), payment_date: new Date().toISOString().split('T')[0], amount_paid: Number(form.amount_paid), payment_status: form.payment_status,
      });
      onDone();
    } catch (e2) { setErr(e2.message); } finally { setSaving(false); }
  }

  return (
    <form onSubmit={submit}>
      {err && <div style={{ background: T.dangerSoft, color: T.danger, fontSize: 12, padding: 8, borderRadius: 6, marginBottom: 12 }}>{err}</div>}
      <label style={labelStyle}>Select Verified Invoice</label>
      <select style={inputStyle} required value={form.invoice_id} onChange={e => setForm({ ...form, invoice_id: e.target.value })}>
        <option value="">Select Invoice...</option>
        {invoices.map(i => <option key={i.invoice_id} value={i.invoice_id}>INV-{String(i.invoice_id).padStart(4, '0')} ({money(i.invoice_amount)})</option>)}
      </select>
      <label style={labelStyle}>Amount Paid (₹)</label>
      <input style={inputStyle} type="number" required min="0" value={form.amount_paid} onChange={e => setForm({ ...form, amount_paid: e.target.value })} />
      <label style={labelStyle}>Payment Status</label>
      <select style={inputStyle} value={form.payment_status} onChange={e => setForm({ ...form, payment_status: e.target.value })}>
        <option value="Paid">Paid</option><option value="Pending">Pending</option><option value="Failed">Failed</option>
      </select>
      <button style={btnStyle} disabled={saving}>{saving ? 'Processing...' : 'Record Payment'}</button>
    </form>
  );
}

// ============================================================
// MAIN APPLICATION ROOT
// ============================================================
const INTERNAL_NAV = [
  { key: 'dashboard', label: 'Dashboard', roles: ['Employee', 'Manager', 'Procurement Officer', 'Quality Inspector', 'Admin'] },
  { key: 'requests', label: 'Purchase Requests', roles: ['Employee', 'Manager', 'Procurement Officer', 'Admin'] },
  { key: 'rfq', label: 'RFQ & Quotations', roles: ['Procurement Officer', 'Admin'] },
  { key: 'vendors', label: 'Vendors & Ratings', roles: ['Procurement Officer', 'Admin'] },
  { key: 'orders', label: 'Purchase Orders', roles: ['Procurement Officer', 'Admin'] },
  { key: 'delivery', label: 'Delivery & QC', roles: ['Quality Inspector', 'Procurement Officer', 'Admin'] },
  { key: 'finance', label: 'Invoices & Payments', roles: ['Manager', 'Procurement Officer', 'Admin'] },
  { key: 'master', label: 'Master Data Setup', roles: ['Admin', 'Manager', 'Procurement Officer'] },
];

const VENDOR_NAV = [
  { key: 'v_rfq', label: 'My RFQs' },
  { key: 'v_quotes', label: 'My Quotations' },
  { key: 'v_orders', label: 'My Orders' },
  { key: 'v_finance', label: 'My Invoices & Payments' },
];

export default function App() {
  const [currentUser, setCurrentUser] = useState(null); // Employee profile
  const [currentVendor, setCurrentVendor] = useState(null); // Vendor profile
  const [page, setPage] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modal, setModal] = useState(null);
  const [editingVendor, setEditingVendor] = useState(null);
  const [ratingVendor, setRatingVendor] = useState(null);
  const [busyId, setBusyId] = useState(null);

  // Database Data States across all 18 tables
  const [corporation, setCorporation] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [roles, setRoles] = useState([]);
  const [products, setProducts] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [purchaseRequests, setPurchaseRequests] = useState([]);
  const [prItems, setPrItems] = useState([]);
  const [rfqs, setRfqs] = useState([]);
  const [rfqVendors, setRfqVendors] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [inspections, setInspections] = useState([]);
  const [distributions, setDistributions] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);

  const loadAll = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [
        corpData, empData, deptData, roleData, prodData, vendorData, ratingData,
        prData, prItemData, rfqData, rfqVendorData, quoteData, poData, delData,
        qcData, distData, invData, payData
      ] = await Promise.all([
        sb('corporation?select=*'),
        sb('employee?select=employee_id,name,email,department_id,role_id,department:department_id(department_name),role:role_id(role_name)'),
        sb('department?select=department_id,department_name'),
        sb('role?select=role_id,role_name'),
        sb('product?select=product_id,product_name,category,unit'),
        sb('vendor?select=vendor_id,vendor_name,email,phone,address,gst_no'),
        sb('vendor_rating?select=vendor_id,rating_score,rating_date&order=rating_date.desc'),
        sb('purchase_request?select=pr_id,request_date,approval_status,requestor:employee!requestor_id(name),approver:employee!approver_id(name),department:department_id(department_name)&order=request_date.desc'),
        sb('purchase_request_item?select=pr_item_id,pr_id,quantity,required_date,product:product_id(product_name,unit)').catch(() => []),
        sb('rfq?select=rfq_id,pr_id,issue_date,due_date,procurement_officer:employee!procurement_officer_id(name)'),
        sb('rfq_vendor?select=*').catch(() => []),
        sb('quotation?select=quotation_id,rfq_id,quoted_price,delivery_days,vendor_id,vendor:vendor_id(vendor_name)'),
        sb('purchase_order?select=po_id,po_date,total_amount,po_status,quotation:quotation_id(vendor:vendor_id(vendor_name)),procurement_officer:employee!procurement_officer_id(name)&order=po_date.desc'),
        sb('delivery?select=delivery_id,po_id,delivery_date,delivery_status&order=delivery_date.desc'),
        sb('quality_inspection?select=inspection_id,delivery_id,inspection_date,result,inspector:employee!inspector_id(name)&order=inspection_date.desc').catch(() => []),
        sb('distribution?select=distribution_id,delivery_id,distributed_date,department:department_id(department_name),received_by_emp:employee!received_by(name)&order=distributed_date.desc').catch(() => []),
        sb('invoice?select=invoice_id,po_id,invoice_amount,verification_status,vendor:vendor_id(vendor_name)&order=invoice_date.desc'),
        sb('payment?select=payment_id,invoice_id,amount_paid,payment_status&order=payment_date.desc'),
      ]);

      const latestRating = {};
      ratingData.forEach(r => { if (!(r.vendor_id in latestRating)) latestRating[r.vendor_id] = r.rating_score; });

      setCorporation(corpData[0] || null);
      setEmployees(empData);
      setDepartments(deptData);
      setRoles(roleData);
      setProducts(prodData);
      setVendors(vendorData.map(v => ({ ...v, rating: latestRating[v.vendor_id] ?? null })));
      setPurchaseRequests(prData);
      setPrItems(prItemData);
      setRfqs(rfqData);
      setRfqVendors(rfqVendorData);
      setQuotations(quoteData.map(q => ({
        ...q, vendor: q.vendor?.vendor_name ?? 'Unknown', price: Number(q.quoted_price), days: Number(q.delivery_days), rating: latestRating[q.vendor_id] ?? 0,
      })));
      setPurchaseOrders(poData);
      setDeliveries(delData);
      setInspections(qcData);
      setDistributions(distData);
      setInvoices(invData);
      setPayments(payData);
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // If neither Employee nor Vendor is logged in, render Login Page
  if (!currentUser && !currentVendor) {
    return (
      <LoginPage
        employees={employees}
        vendors={vendors}
        onEmployeeLogin={(emp) => { setCurrentUser(emp); setCurrentVendor(null); setPage('dashboard'); }}
        onVendorLogin={(v) => { setCurrentVendor(v); setCurrentUser(null); setPage('v_rfq'); }}
      />
    );
  }

  // Generic Handlers
  async function handleDelete(table, idColumn, idValue) {
    if (!window.confirm(`Delete record from ${table}?`)) return;
    setBusyId(idValue);
    try { await sbDelete(table, idColumn, idValue); await loadAll(); }
    catch (e) { alert('Delete failed: ' + e.message); } finally { setBusyId(null); }
  }

  async function setRequestStatus(pr_id, status) {
    setBusyId(pr_id);
    try {
      await sbUpdate('purchase_request', 'pr_id', pr_id, { approval_status: status, approver_id: currentUser?.employee_id || null });
      await loadAll();
    } catch (e) { alert('Update failed: ' + e.message); } finally { setBusyId(null); }
  }

  async function updatePOStatus(po_id, status) {
    setBusyId(po_id);
    try { await sbUpdate('purchase_order', 'po_id', po_id, { po_status: status }); await loadAll(); }
    catch (e) { alert('Update failed: ' + e.message); } finally { setBusyId(null); }
  }

  async function updateDeliveryStatus(delivery_id, status) {
    setBusyId(delivery_id);
    try { await sbUpdate('delivery', 'delivery_id', delivery_id, { delivery_status: status }); await loadAll(); }
    catch (e) { alert('Update failed: ' + e.message); } finally { setBusyId(null); }
  }

  async function updateInvoiceStatus(invoice_id, status) {
    setBusyId(invoice_id);
    try { await sbUpdate('invoice', 'invoice_id', invoice_id, { verification_status: status }); await loadAll(); }
    catch (e) { alert('Update failed: ' + e.message); } finally { setBusyId(null); }
  }

  // Role Navigation Determination
  const userRole = currentUser ? (currentUser.role?.role_name || 'Employee') : 'Vendor';
  const navItems = currentUser
    ? INTERNAL_NAV.filter(n => n.roles.includes(userRole) || userRole === 'Admin')
    : VENDOR_NAV;

  const pageTitle = (currentUser ? INTERNAL_NAV : VENDOR_NAV).find(n => n.key === page)?.label ?? 'Dashboard';
  const pendingApprovals = purchaseRequests.filter(r => r.approval_status === 'Pending').length;
  const totalPaid = payments.filter(p => p.payment_status === 'Paid').reduce((s, p) => s + Number(p.amount_paid), 0);
  const totalInvoiced = invoices.reduce((s, i) => s + Number(i.invoice_amount), 0);
  const paymentsDue = Math.max(totalInvoiced - totalPaid, 0);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: T.bg, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      {/* SIDEBAR NAVIGATION */}
      <aside style={{ width: 250, background: T.ink, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '22px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#fff' }}>
          <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: 0.5 }}>ProcureX</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>{corporation?.company_name || 'Enterprise Portal'}</div>
        </div>

        {/* LOGGED IN USER / VENDOR SESSION HEADER */}
        <div style={{ padding: '14px 18px', background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 13, color: '#fff', fontWeight: 600 }}>{currentUser ? currentUser.name : currentVendor.vendor_name}</div>
            <div style={{ fontSize: 10, color: currentUser ? T.accentSoft : T.warnSoft, fontWeight: 600, marginTop: 2 }}>{userRole} Portal</div>
          </div>
          <button onClick={() => { setCurrentUser(null); setCurrentVendor(null); }} style={{ padding: '4px 8px', borderRadius: 4, border: 'none', background: T.danger, color: '#fff', fontSize: 10, cursor: 'pointer', fontWeight: 600 }}>Logout</button>
        </div>

        <nav style={{ padding: 12 }}>
          {navItems.map(item => (
            <button key={item.key} onClick={() => setPage(item.key)} style={{
              display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', marginBottom: 4,
              borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: page === item.key ? 600 : 400,
              background: page === item.key ? 'rgba(255,255,255,0.12)' : 'transparent',
              color: page === item.key ? '#fff' : 'rgba(255,255,255,0.65)',
            }}>{item.label}</button>
          ))}
        </nav>
      </aside>

      {/* MAIN BODY AREA */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <header style={{ padding: '18px 30px', borderBottom: `1px solid ${T.line}`, background: T.surface, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, color: T.inkMuted }}>ProcureX / {pageTitle} {loading ? '(syncing...)' : ''}</div>
            <h1 style={{ fontSize: 22, margin: '4px 0 0', color: T.ink, fontWeight: 700 }}>{pageTitle}</h1>
          </div>
          {currentUser && (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button onClick={() => setModal('request')} style={{ padding: '8px 14px', borderRadius: 6, border: 'none', background: T.accent, color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>+ PR</button>
              {(userRole === 'Procurement Officer' || userRole === 'Admin') && (
                <>
                  <button onClick={() => setModal('rfq')} style={{ padding: '8px 14px', borderRadius: 6, border: `1px solid ${T.line}`, background: T.surface, color: T.ink, fontSize: 13, cursor: 'pointer' }}>+ RFQ</button>
                  <button onClick={() => setModal('quotation')} style={{ padding: '8px 14px', borderRadius: 6, border: `1px solid ${T.line}`, background: T.surface, color: T.ink, fontSize: 13, cursor: 'pointer' }}>+ Quote</button>
                  <button onClick={() => setModal('order')} style={{ padding: '8px 14px', borderRadius: 6, border: `1px solid ${T.line}`, background: T.surface, color: T.ink, fontSize: 13, cursor: 'pointer' }}>+ PO</button>
                </>
              )}
            </div>
          )}
          {currentVendor && (
            <button onClick={() => setModal('quotation')} style={{ padding: '8px 14px', borderRadius: 6, border: 'none', background: T.accent, color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
              + Submit Quotation
            </button>
          )}
        </header>

        <main style={{ flex: 1, padding: 30, overflowY: 'auto' }}>
          {error && (
            <div style={{ marginBottom: 20, padding: 14, borderRadius: 8, background: T.dangerSoft, color: T.danger, fontSize: 13 }}>
              <strong>Database API Error:</strong> {error}
            </div>
          )}

          {/* ==================== VENDOR PORTAL PAGES ==================== */}
          {currentVendor && page === 'v_rfq' && (
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: T.ink, marginBottom: 10 }}>Open RFQs Sent To {currentVendor.vendor_name}</div>
              <Table empty="No active RFQs issued to your account."
                columns={['RFQ ID', 'PR Reference', 'Procurement Officer', 'Issue Date', 'Due Date', 'Actions']}
                rows={rfqs.filter(r => rfqVendors.some(rv => rv.rfq_id === r.rfq_id && rv.vendor_id === currentVendor.vendor_id)).map(r => [
                  `RFQ-${String(r.rfq_id).padStart(4, '0')}`, `PR-${String(r.pr_id).padStart(4, '0')}`,
                  r.procurement_officer?.name ?? '-', r.issue_date, r.due_date || '-',
                  <button style={smallBtnAccent} onClick={() => setModal('quotation')}>Submit Quotation</button>
                ])} />
            </div>
          )}

          {currentVendor && page === 'v_quotes' && (
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: T.ink, marginBottom: 10 }}>My Submitted Quotations</div>
              <Table empty="No quotations submitted."
                columns={['Quote ID', 'RFQ Reference', 'Quoted Price', 'Delivery Days', 'Rating', 'Evaluated Score']}
                rows={scoreVendors(quotations.filter(q => q.vendor_id === currentVendor.vendor_id)).map(q => [
                  `Q-${String(q.quotation_id).padStart(4, '0')}`, `RFQ-${String(q.rfq_id).padStart(4, '0')}`,
                  money(q.price), `${q.days} days`, `★ ${q.rating ? Number(q.rating).toFixed(1) : 'Unrated'}`,
                  <strong style={{ fontFamily: 'monospace', color: T.accent }}>{(q.score * 100).toFixed(1)}/100</strong>
                ])} />
            </div>
          )}

          {currentVendor && page === 'v_orders' && (
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: T.ink, marginBottom: 10 }}>My Awarded Purchase Orders</div>
              <Table empty="No purchase orders awarded."
                columns={['PO ID', 'Procurement Officer', 'PO Date', 'Total Amount', 'Status']}
                rows={purchaseOrders.filter(o => o.quotation?.vendor_id === currentVendor.vendor_id).map(o => [
                  `PO-${String(o.po_id).padStart(4, '0')}`, o.procurement_officer?.name ?? '-',
                  o.po_date, money(o.total_amount), <StatusBadge status={o.po_status} />
                ])} />
            </div>
          )}

          {currentVendor && page === 'v_finance' && (
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: T.ink, marginBottom: 10 }}>My Invoices & Payment Status</div>
              <Table empty="No invoices issued."
                columns={['Invoice ID', 'PO Ref', 'Invoice Amount', 'Verification Status']}
                rows={invoices.filter(i => i.vendor_id === currentVendor.vendor_id).map(i => [
                  `INV-${String(i.invoice_id).padStart(4, '0')}`, `PO-${String(i.po_id).padStart(4, '0')}`,
                  money(i.invoice_amount), <StatusBadge status={i.verification_status} />
                ])} />
            </div>
          )}

          {/* ==================== INTERNAL EMPLOYEE PORTAL PAGES ==================== */}
          {currentUser && page === 'dashboard' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 16, marginBottom: 20 }}>
                <KPI label="Purchase Requests" value={String(purchaseRequests.length).padStart(2, '0')} sub={`${pendingApprovals} pending approval`} />
                <KPI label="Active Orders" value={String(purchaseOrders.length).padStart(2, '0')} sub={money(purchaseOrders.reduce((s, o) => s + Number(o.total_amount), 0))} />
                <KPI label="Deliveries Tracked" value={String(deliveries.filter(d => d.delivery_status !== 'Delivered').length).padStart(2, '0')} sub={`${deliveries.length} total deliveries`} />
                <KPI label="Pending Payments" value={money(paymentsDue)} sub={`${money(totalPaid)} cleared`} />
              </div>
              <div style={{ marginBottom: 20 }}>
                <Pipeline current={purchaseOrders.length ? 6 : 1} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 20 }}>
                <VendorScorecard quotations={quotations} />
                <Card>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: T.ink }}>Registered Vendors</div>
                    <button onClick={() => { setEditingVendor(null); setModal('vendor'); }} style={{ fontSize: 12, border: 'none', background: 'none', color: T.accent, cursor: 'pointer', fontWeight: 600 }}>+ Add Vendor</button>
                  </div>
                  {vendors.map(v => (
                    <div key={v.vendor_id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 10, paddingBottom: 8, borderBottom: `1px solid ${T.line}` }}>
                      <span>{v.vendor_name}</span>
                      <span style={{ fontFamily: 'monospace', color: T.inkMuted }}>★ {v.rating ? Number(v.rating).toFixed(1) : 'Unrated'}</span>
                    </div>
                  ))}
                </Card>
              </div>
            </div>
          )}

          {currentUser && page === 'requests' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: T.ink }}>Purchase Requests (PURCHASE_REQUEST)</div>
                <button onClick={() => setModal('request')} style={{ padding: '6px 12px', borderRadius: 6, border: 'none', background: T.accent, color: '#fff', fontSize: 12, cursor: 'pointer' }}>+ New PR</button>
              </div>
              <Table empty="No purchase requests logged."
                columns={['PR ID', 'Requestor', 'Department', 'Request Date', 'Approver', 'Status', 'Actions']}
                rows={purchaseRequests.map(r => [
                  `PR-${String(r.pr_id).padStart(4, '0')}`, r.requestor?.name ?? '-', r.department?.department_name ?? '-',
                  r.request_date, r.approver?.name ?? '-', <StatusBadge status={r.approval_status} />,
                  <span>
                    {r.approval_status === 'Pending' && (userRole === 'Manager' || userRole === 'Admin') && (
                      <>
                        <button style={smallBtnAccent} disabled={busyId === r.pr_id} onClick={() => setRequestStatus(r.pr_id, 'Approved')}>Approve</button>
                        <button style={smallBtnDanger} disabled={busyId === r.pr_id} onClick={() => setRequestStatus(r.pr_id, 'Rejected')}>Reject</button>
                      </>
                    )}
                    <button style={smallBtnDanger} onClick={() => handleDelete('purchase_request', 'pr_id', r.pr_id)}>Delete</button>
                  </span>,
                ])} />

              <div style={{ fontSize: 15, fontWeight: 600, color: T.ink, margin: '24px 0 10px' }}>Requisition Line Items (PURCHASE_REQUEST_ITEM)</div>
              <Table empty="No items requested." columns={['Item ID', 'PR Reference', 'Product Name', 'Quantity', 'Unit', 'Required Date']}
                rows={prItems.map(item => [
                  `ITEM-${String(item.pr_item_id).padStart(4, '0')}`, `PR-${String(item.pr_id).padStart(4, '0')}`,
                  item.product?.product_name ?? '-', item.quantity, item.product?.unit ?? 'piece', item.required_date || '-',
                ])} />
            </div>
          )}

          {currentUser && page === 'rfq' && (
            <div>
              <div style={{ marginBottom: 20 }}><VendorScorecard quotations={quotations} /></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: T.ink }}>RFQs Issued (RFQ & RFQ_VENDOR)</div>
                <button onClick={() => setModal('rfq')} style={{ padding: '6px 12px', borderRadius: 6, border: 'none', background: T.accent, color: '#fff', fontSize: 12, cursor: 'pointer' }}>+ Issue RFQ</button>
              </div>
              <Table empty="No RFQs issued." columns={['RFQ ID', 'PR Reference', 'Procurement Officer', 'Issue Date', 'Due Date', 'Actions']}
                rows={rfqs.map(r => [
                  `RFQ-${String(r.rfq_id).padStart(4, '0')}`, `PR-${String(r.pr_id).padStart(4, '0')}`,
                  r.procurement_officer?.name ?? '-', r.issue_date, r.due_date || '-',
                  <button style={smallBtnDanger} onClick={() => handleDelete('rfq', 'rfq_id', r.rfq_id)}>Delete</button>
                ])} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '24px 0 10px' }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: T.ink }}>Submitted Quotations (QUOTATION)</div>
                <button onClick={() => setModal('quotation')} style={{ padding: '6px 12px', borderRadius: 6, border: `1px solid ${T.line}`, background: T.surface, color: T.ink, fontSize: 12, cursor: 'pointer' }}>+ Add Quote</button>
              </div>
              <Table empty="No quotations recorded yet." columns={['Quote ID', 'RFQ Ref', 'Vendor Name', 'Quoted Price', 'Delivery Days', 'Rating', 'Evaluated Score', 'Actions']}
                rows={scoreVendors(quotations).map(q => [
                  `Q-${String(q.quotation_id).padStart(4, '0')}`, `RFQ-${String(q.rfq_id).padStart(4, '0')}`, q.vendor, money(q.price), `${q.days} days`,
                  `★ ${q.rating ? Number(q.rating).toFixed(1) : 'Unrated'}`,
                  <strong style={{ fontFamily: 'monospace', color: T.accent }}>{(q.score * 100).toFixed(1)}/100</strong>,
                  <button style={smallBtnDanger} onClick={() => handleDelete('quotation', 'quotation_id', q.quotation_id)}>Delete</button>
                ])} />
            </div>
          )}

          {currentUser && page === 'vendors' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
                <button onClick={() => { setEditingVendor(null); setModal('vendor'); }} style={{ padding: '8px 14px', borderRadius: 6, border: 'none', background: T.accent, color: '#fff', fontSize: 13, cursor: 'pointer' }}>+ Add Vendor</button>
              </div>
              <Table empty="No vendors registered." columns={['Vendor Name', 'Email', 'Phone', 'Address', 'GST No', 'Rating', 'Actions']}
                rows={vendors.map(v => [
                  <strong>{v.vendor_name}</strong>, v.email || '-', v.phone || '-', v.address || '-', v.gst_no || '-',
                  `★ ${v.rating ? Number(v.rating).toFixed(1) : 'Unrated'}`,
                  <span>
                    <button style={smallBtnAccent} onClick={() => { setEditingVendor(v); setModal('vendor'); }}>Edit</button>
                    <button style={smallBtn} onClick={() => { setRatingVendor(v); setModal('rate'); }}>Rate</button>
                    <button style={smallBtnDanger} disabled={busyId === v.vendor_id} onClick={() => handleDelete('vendor', 'vendor_id', v.vendor_id)}>Delete</button>
                  </span>,
                ])} />
            </div>
          )}

          {currentUser && page === 'orders' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: T.ink }}>Purchase Orders (PURCHASE_ORDER)</div>
                <button onClick={() => setModal('order')} style={{ padding: '6px 12px', borderRadius: 6, border: 'none', background: T.accent, color: '#fff', fontSize: 12, cursor: 'pointer' }}>+ Issue PO</button>
              </div>
              <Table empty="No purchase orders issued." columns={['PO ID', 'Vendor Name', 'Officer', 'PO Date', 'Total Amount', 'Status', 'Actions']}
                rows={purchaseOrders.map(o => [
                  `PO-${String(o.po_id).padStart(4, '0')}`, o.quotation?.vendor?.vendor_name ?? '-',
                  o.procurement_officer?.name ?? '-', o.po_date, money(o.total_amount), <StatusBadge status={o.po_status} />,
                  <span>
                    {o.po_status === 'Issued' && <button style={smallBtnAccent} onClick={() => updatePOStatus(o.po_id, 'Completed')}>Mark Completed</button>}
                    {o.po_status !== 'Cancelled' && <button style={smallBtnDanger} onClick={() => updatePOStatus(o.po_id, 'Cancelled')}>Cancel</button>}
                    <button style={smallBtnDanger} onClick={() => handleDelete('purchase_order', 'po_id', o.po_id)}>Delete</button>
                  </span>,
                ])} />
            </div>
          )}

          {currentUser && page === 'delivery' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: T.ink }}>Deliveries (DELIVERY)</div>
                <button onClick={() => setModal('delivery')} style={{ padding: '6px 12px', borderRadius: 6, border: 'none', background: T.accent, color: '#fff', fontSize: 12, cursor: 'pointer' }}>+ Log Delivery</button>
              </div>
              <Table empty="No deliveries logged." columns={['Delivery ID', 'PO Number', 'Delivery Date', 'Status', 'Actions']}
                rows={deliveries.map(d => [
                  `DL-${String(d.delivery_id).padStart(4, '0')}`, `PO-${String(d.po_id).padStart(4, '0')}`,
                  d.delivery_date || 'Pending', <StatusBadge status={d.delivery_status} />,
                  <span>
                    {d.delivery_status !== 'Delivered' && <button style={smallBtnAccent} onClick={() => updateDeliveryStatus(d.delivery_id, 'Delivered')}>Set Delivered</button>}
                    <button style={smallBtnDanger} onClick={() => handleDelete('delivery', 'delivery_id', d.delivery_id)}>Delete</button>
                  </span>,
                ])} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '24px 0 10px' }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: T.ink }}>Quality Inspections (QUALITY_INSPECTION)</div>
                <button onClick={() => setModal('inspection')} style={{ padding: '6px 12px', borderRadius: 6, border: `1px solid ${T.line}`, background: T.surface, color: T.ink, fontSize: 12, cursor: 'pointer' }}>+ Log QC</button>
              </div>
              <Table empty="No inspection logs." columns={['Inspection ID', 'Delivery Reference', 'Inspector Employee', 'Inspection Date', 'Result', 'Actions']}
                rows={inspections.map(i => [
                  `QC-${String(i.inspection_id).padStart(4, '0')}`, `DL-${String(i.delivery_id).padStart(4, '0')}`,
                  i.inspector?.name ?? '-', i.inspection_date, <StatusBadge status={i.result} />,
                  <button style={smallBtnDanger} onClick={() => handleDelete('quality_inspection', 'inspection_id', i.inspection_id)}>Delete</button>
                ])} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '24px 0 10px' }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: T.ink }}>Department Distributions (DISTRIBUTION)</div>
                <button onClick={() => setModal('distribution')} style={{ padding: '6px 12px', borderRadius: 6, border: `1px solid ${T.line}`, background: T.surface, color: T.ink, fontSize: 12, cursor: 'pointer' }}>+ Log Distribution</button>
              </div>
              <Table empty="No distribution logs." columns={['Distribution ID', 'Delivery Reference', 'Receiving Department', 'Distributed Date', 'Received By Employee', 'Actions']}
                rows={distributions.map(dist => [
                  `DIST-${String(dist.distribution_id).padStart(4, '0')}`, `DL-${String(dist.delivery_id).padStart(4, '0')}`,
                  dist.department?.department_name ?? '-', dist.distributed_date, dist.received_by_emp?.name ?? '-',
                  <button style={smallBtnDanger} onClick={() => handleDelete('distribution', 'distribution_id', dist.distribution_id)}>Delete</button>
                ])} />
            </div>
          )}

          {currentUser && page === 'finance' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: T.ink }}>Vendor Invoices (INVOICE)</div>
                <button onClick={() => setModal('invoice')} style={{ padding: '6px 12px', borderRadius: 6, border: 'none', background: T.accent, color: '#fff', fontSize: 12, cursor: 'pointer' }}>+ Issue Invoice</button>
              </div>
              <Table empty="No invoices." columns={['Invoice ID', 'PO Number', 'Vendor Name', 'Invoice Date', 'Amount', 'Verification Status', 'Actions']}
                rows={invoices.map(v => [
                  `INV-${String(v.invoice_id).padStart(4, '0')}`, `PO-${String(v.po_id).padStart(4, '0')}`,
                  v.vendor?.vendor_name ?? '-', v.invoice_date || '-', money(v.invoice_amount), <StatusBadge status={v.verification_status} />,
                  <span>
                    {v.verification_status === 'Pending' && (
                      <>
                        <button style={smallBtnAccent} onClick={() => updateInvoiceStatus(v.invoice_id, 'Verified')}>Verify</button>
                        <button style={smallBtnDanger} onClick={() => updateInvoiceStatus(v.invoice_id, 'Disputed')}>Dispute</button>
                      </>
                    )}
                    <button style={smallBtnDanger} onClick={() => handleDelete('invoice', 'invoice_id', v.invoice_id)}>Delete</button>
                  </span>,
                ])} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '24px 0 10px' }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: T.ink }}>Payment Release Transactions (PAYMENT)</div>
                <button onClick={() => setModal('payment')} style={{ padding: '6px 12px', borderRadius: 6, border: `1px solid ${T.line}`, background: T.surface, color: T.ink, fontSize: 12, cursor: 'pointer' }}>+ Process Payment</button>
              </div>
              <Table empty="No payments recorded." columns={['Payment ID', 'Invoice Reference', 'Payment Date', 'Amount Paid', 'Status', 'Actions']}
                rows={payments.map(p => [
                  `PAY-${String(p.payment_id).padStart(4, '0')}`, `INV-${String(p.invoice_id).padStart(4, '0')}`,
                  p.payment_date || '-', money(p.amount_paid), <StatusBadge status={p.payment_status} />,
                  <button style={smallBtnDanger} onClick={() => handleDelete('payment', 'payment_id', p.payment_id)}>Delete</button>
                ])} />
            </div>
          )}

          {currentUser && page === 'master' && (
            <div>
              {corporation && (
                <Card style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: T.ink }}>Organization Profile (CORPORATION)</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginTop: 10, fontSize: 13 }}>
                    <div><strong>Company Name:</strong> {corporation.company_name}</div>
                    <div><strong>Address:</strong> {corporation.address}</div>
                    <div><strong>GST No:</strong> {corporation.gst_no}</div>
                  </div>
                </Card>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: T.ink }}>Departments (DEPARTMENT)</div>
                    <button onClick={() => setModal('department')} style={{ padding: '4px 10px', borderRadius: 5, border: 'none', background: T.accent, color: '#fff', fontSize: 12, cursor: 'pointer' }}>+ Dept</button>
                  </div>
                  <Table empty="No departments." columns={['ID', 'Department Name', 'Actions']}
                    rows={departments.map(d => [
                      `DEPT-${d.department_id}`, d.department_name,
                      <button style={smallBtnDanger} onClick={() => handleDelete('department', 'department_id', d.department_id)}>Delete</button>
                    ])} />
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: T.ink }}>Roles (ROLE)</div>
                    <button onClick={() => setModal('role')} style={{ padding: '4px 10px', borderRadius: 5, border: 'none', background: T.accent, color: '#fff', fontSize: 12, cursor: 'pointer' }}>+ Role</button>
                  </div>
                  <Table empty="No roles." columns={['ID', 'Role Name', 'Actions']}
                    rows={roles.map(r => [
                      `ROLE-${r.role_id}`, r.role_name,
                      <button style={smallBtnDanger} onClick={() => handleDelete('role', 'role_id', r.role_id)}>Delete</button>
                    ])} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: T.ink }}>Employees (EMPLOYEE)</div>
                <button onClick={() => setModal('employee')} style={{ padding: '6px 12px', borderRadius: 6, border: 'none', background: T.accent, color: '#fff', fontSize: 12, cursor: 'pointer' }}>+ Add Employee</button>
              </div>
              <Table empty="No employees." columns={['ID', 'Name', 'Email', 'Department', 'Role', 'Actions']}
                rows={employees.map(e => [
                  `EMP-${e.employee_id}`, <strong>{e.name}</strong>, e.email, e.department?.department_name ?? '-', e.role?.role_name ?? '-',
                  <button style={smallBtnDanger} onClick={() => handleDelete('employee', 'employee_id', e.employee_id)}>Delete</button>
                ])} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '24px 0 10px' }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: T.ink }}>Products Catalog (PRODUCT)</div>
                <button onClick={() => setModal('product')} style={{ padding: '6px 12px', borderRadius: 6, border: 'none', background: T.accent, color: '#fff', fontSize: 12, cursor: 'pointer' }}>+ Add Product</button>
              </div>
              <Table empty="No products cataloged." columns={['ID', 'Product Name', 'Category', 'Unit', 'Actions']}
                rows={products.map(p => [
                  `PROD-${p.product_id}`, <strong>{p.product_name}</strong>, p.category, p.unit,
                  <button style={smallBtnDanger} onClick={() => handleDelete('product', 'product_id', p.product_id)}>Delete</button>
                ])} />
            </div>
          )}
        </main>
      </div>

      {/* DYNAMIC MODALS FOR ALL CREATION LOGICS */}
      <Modal open={modal === 'department'} onClose={() => setModal(null)} title="Create New Department">
        <DepartmentForm corporationId={corporation?.company_id} onDone={() => { setModal(null); loadAll(); }} />
      </Modal>

      <Modal open={modal === 'role'} onClose={() => setModal(null)} title="Create New Role">
        <RoleForm onDone={() => { setModal(null); loadAll(); }} />
      </Modal>

      <Modal open={modal === 'employee'} onClose={() => setModal(null)} title="Create New Employee Profile">
        <EmployeeForm departments={departments} roles={roles} onDone={() => { setModal(null); loadAll(); }} />
      </Modal>

      <Modal open={modal === 'product'} onClose={() => setModal(null)} title="Catalog New Product">
        <ProductForm onDone={() => { setModal(null); loadAll(); }} />
      </Modal>

      <Modal open={modal === 'vendor'} onClose={() => setModal(null)} title={editingVendor ? 'Edit Vendor' : 'Add Vendor'}>
        <VendorForm existing={editingVendor} onDone={() => { setModal(null); setEditingVendor(null); loadAll(); }} />
      </Modal>

      <Modal open={modal === 'rate'} onClose={() => setModal(null)} title="Rate Vendor Performance">
        <RateVendorForm vendor={ratingVendor} onDone={() => { setModal(null); setRatingVendor(null); loadAll(); }} />
      </Modal>

      <Modal open={modal === 'request'} onClose={() => setModal(null)} title="New Purchase Request (PR & Item)">
        <RequestForm currentUser={currentUser} employees={employees} departments={departments} products={products} onDone={() => { setModal(null); loadAll(); }} />
      </Modal>

      <Modal open={modal === 'rfq'} onClose={() => setModal(null)} title="Issue Request For Quotation (RFQ)">
        <IssueRFQForm approvedPRs={purchaseRequests.filter(r => r.approval_status === 'Approved')} officers={employees.filter(e => e.role?.role_name === 'Procurement Officer')} vendors={vendors} onDone={() => { setModal(null); loadAll(); }} />
      </Modal>

      <Modal open={modal === 'quotation'} onClose={() => setModal(null)} title="Submit Vendor Quotation">
        <QuotationForm defaultVendorId={currentVendor?.vendor_id} rfqList={rfqs} vendors={vendors} onDone={() => { setModal(null); loadAll(); }} />
      </Modal>

      <Modal open={modal === 'order'} onClose={() => setModal(null)} title="Issue Purchase Order (PO)">
        <IssuePOForm quotations={quotations} officers={employees.filter(e => e.role?.role_name === 'Procurement Officer')} onDone={() => { setModal(null); loadAll(); }} />
      </Modal>

      <Modal open={modal === 'delivery'} onClose={() => setModal(null)} title="Log PO Delivery">
        <DeliveryForm orders={purchaseOrders} onDone={() => { setModal(null); loadAll(); }} />
      </Modal>

      <Modal open={modal === 'inspection'} onClose={() => setModal(null)} title="Perform Quality Inspection (QC)">
        <QCForm deliveries={deliveries} employees={employees} onDone={() => { setModal(null); loadAll(); }} />
      </Modal>

      <Modal open={modal === 'distribution'} onClose={() => setModal(null)} title="Log Department Distribution">
        <DistributionForm deliveries={deliveries} departments={departments} employees={employees} onDone={() => { setModal(null); loadAll(); }} />
      </Modal>

      <Modal open={modal === 'invoice'} onClose={() => setModal(null)} title="Issue Vendor Invoice">
        <InvoiceForm orders={purchaseOrders} vendors={vendors} onDone={() => { setModal(null); loadAll(); }} />
      </Modal>

      <Modal open={modal === 'payment'} onClose={() => setModal(null)} title="Process Payment Transaction">
        <PaymentForm invoices={invoices.filter(i => i.verification_status === 'Verified')} onDone={() => { setModal(null); loadAll(); }} />
      </Modal>
    </div>
  );
}
