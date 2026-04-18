'use client';

import { useEffect, useState } from 'react';
import {
  User, Shield, MapPin, Copy, Check, Lock, Eye, EyeOff,
  Loader2, CheckCircle2, AlertCircle, CalendarDays, X, Camera,
} from 'lucide-react';
import { getMyProfile, type UserProfile } from '@/services/profileService';
import { createClient } from '@/lib/supabase/client';

/* ─── helpers ─────────────────────────────────────────────────── */

type Tab = 'personal' | 'account';

function maskCid(cid: string): string {
  if (cid.length !== 13) return cid;
  const last = cid[12];
  return `X-XXXX-XXXXX-XX-${last}`;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handle = async () => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }
    catch { /* silent */ }
  };
  return (
    <button onClick={handle} title="คัดลอก" className="ml-1.5 p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 mb-1.5">{label}</label>
      <div className="w-full text-sm text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5 min-h-[40px] flex items-center flex-wrap gap-1.5">
        {children}
      </div>
    </div>
  );
}

/* ─── Change Password Modal ────────────────────────────────────── */

function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [newPwd,    setNewPwd]    = useState('');
  const [confPwd,   setConfPwd]   = useState('');
  const [showNew,   setShowNew]   = useState(false);
  const [showConf,  setShowConf]  = useState(false);
  const [isSaving,  setIsSaving]  = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [success,   setSuccess]   = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPwd.length < 8) { setError('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร'); return; }
    if (newPwd !== confPwd)  { setError('รหัสผ่านไม่ตรงกัน'); return; }
    setIsSaving(true); setError(null);
    try {
      const { error: e } = await createClient().auth.updateUser({ password: newPwd });
      if (e) throw e;
      setSuccess(true);
      setTimeout(onClose, 1800);
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || 'เปลี่ยนรหัสผ่านไม่สำเร็จ');
    } finally { setIsSaving(false); }
  };

  const inputCls = "w-full text-sm border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-11";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <Lock className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-800">เปลี่ยนรหัสผ่าน</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {success ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            </div>
            <p className="text-sm font-semibold text-slate-700">เปลี่ยนรหัสผ่านสำเร็จ</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-5 py-5 flex flex-col gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">รหัสผ่านใหม่</label>
              <div className="relative">
                <input type={showNew ? 'text' : 'password'} value={newPwd} onChange={e => setNewPwd(e.target.value)} className={inputCls} placeholder="อย่างน้อย 8 ตัวอักษร" />
                <button type="button" onClick={() => setShowNew(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">ยืนยันรหัสผ่านใหม่</label>
              <div className="relative">
                <input type={showConf ? 'text' : 'password'} value={confPwd} onChange={e => setConfPwd(e.target.value)} className={inputCls} placeholder="พิมพ์รหัสผ่านอีกครั้ง" />
                <button type="button" onClick={() => setShowConf(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showConf ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            {error && (
              <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-lg">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />{error}
              </div>
            )}
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">
                ยกเลิก
              </button>
              <button type="submit" disabled={isSaving} className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 rounded-xl transition-colors flex items-center justify-center gap-2">
                {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                บันทึก
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

/* ─── Skeleton ─────────────────────────────────────────────────── */

function Skeleton() {
  return (
    <div className="min-h-screen bg-white animate-pulse py-8">
      <div className="max-w-3xl mx-auto px-6 flex flex-col gap-5">
        <div className="bg-white rounded-2xl border border-slate-100 h-28" />
        <div className="bg-white rounded-2xl border border-slate-100 h-12" />
        <div className="bg-white rounded-2xl border border-slate-100 h-72" />
      </div>
    </div>
  );
}

/* ─── Main ─────────────────────────────────────────────────────── */

export default function ProfileClient() {
  const [profile,   setProfile]   = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [showPwd,   setShowPwd]   = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('personal');

  useEffect(() => {
    getMyProfile()
      .then(setProfile)
      .catch((e: unknown) => setError((e as { message?: string })?.message || 'โหลดข้อมูลล้มเหลว'))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) return <Skeleton />;
  if (error || !profile) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <AlertCircle className="w-8 h-8 text-red-400" />
          <p className="text-sm font-semibold text-red-500">{error || 'ไม่พบข้อมูลโปรไฟล์'}</p>
        </div>
      </div>
    );
  }

  const fullNameWithTitle = [profile.title?.short_name, profile.firstname_th, profile.lastname_th].filter(Boolean).join(' ');
  const fullNameEn = [profile.firstname_en, profile.lastname_en].filter(Boolean).join(' ');
  const avatarLetter = (profile.firstname_th || profile.firstname_en || profile.email || '?')[0].toUpperCase();

  const fullAddress = [
    profile.address.subdistrict ? `ต.${profile.address.subdistrict}` : null,
    profile.address.district    ? `อ.${profile.address.district}`    : null,
    profile.address.province    ? `จ.${profile.address.province}`    : null,
    profile.address.zip_code    ? String(profile.address.zip_code)   : null,
  ].filter(Boolean).join(' ');

  const joinedDate = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'personal', label: 'ข้อมูลส่วนตัว' },
    { key: 'account',  label: 'การทำงาน' },
  ];

  return (
    <div className="min-h-screen bg-white py-8">
      <div className="max-w-3xl mx-auto px-6 flex flex-col gap-5">

        {/* ── Header Card ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-white">
                  <User className="w-8 h-8" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center shadow-sm">
                  <Camera className="w-3 h-3 text-slate-400" />
                </div>
              </div>

              {/* Name + meta */}
              <div>
                <div className="flex items-center gap-2.5 mb-0.5">
                  <h1 className="text-xl font-bold text-slate-900">{fullNameWithTitle || 'ผู้ใช้งาน'}</h1>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200">
                    {profile.role?.name || 'guest'}
                  </span>
                </div>
                {fullNameEn && <p className="text-sm text-slate-500 mb-2">{fullNameEn}</p>}
                <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                  {fullAddress && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" />{fullAddress}
                    </span>
                  )}
                  {joinedDate && (
                    <span className="flex items-center gap-1.5">
                      <CalendarDays className="w-3.5 h-3.5" />เข้าร่วม {joinedDate}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Tab Bar ── */}
        <div className="flex items-center gap-1 bg-white rounded-2xl border border-slate-200 shadow-sm p-1.5">
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex-1 py-2 text-sm font-semibold rounded-xl transition-colors ${
                activeTab === key
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── Tab Content ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">

          {/* Personal */}
          {activeTab === 'personal' && (
            <div>
              <h2 className="text-base font-bold text-slate-900 mb-0.5">ข้อมูลส่วนตัว</h2>
              <p className="text-sm text-blue-600 mb-6">อัปเดตรายละเอียดส่วนตัวและข้อมูลโปรไฟล์ของคุณ</p>
              <div className="grid grid-cols-2 gap-4">
                <Field label="คำนำหน้า">
                  {profile.title?.name || <span className="text-slate-300">—</span>}
                </Field>
                <Field label="เพศ">
                  {profile.sex?.name || <span className="text-slate-300">—</span>}
                </Field>
                <Field label="ชื่อ (ไทย)">
                  {profile.firstname_th || <span className="text-slate-300">—</span>}
                </Field>
                <Field label="นามสกุล (ไทย)">
                  {profile.lastname_th || <span className="text-slate-300">—</span>}
                </Field>
                <Field label="First Name (EN)">
                  {profile.firstname_en || <span className="text-slate-300">—</span>}
                </Field>
                <Field label="Last Name (EN)">
                  {profile.lastname_en || <span className="text-slate-300">—</span>}
                </Field>
                <Field label="โทรศัพท์">
                  {profile.phone || <span className="text-slate-300">—</span>}
                </Field>
                <Field label="วันเกิด">
                  {profile.birth_date
                    ? <>{profile.birth_date}{profile.age != null && <span className="text-xs text-slate-500 ml-1">({profile.age} ปี)</span>}</>
                    : <span className="text-slate-300">—</span>}
                </Field>
                <Field label="เลขบัตรประชาชน">
                  {profile.cid
                    ? <span className="font-mono tracking-widest">{maskCid(profile.cid)}</span>
                    : <span className="text-slate-300">—</span>}
                </Field>
              </div>
              <div className="mt-4">
                <Field label="ที่อยู่">
                  {profile.address.detail || fullAddress
                    ? [profile.address.detail, fullAddress].filter(Boolean).join(' ')
                    : <span className="text-slate-300">—</span>}
                </Field>
              </div>
            </div>
          )}

          {/* Account */}
          {activeTab === 'account' && (
            <div>
              <h2 className="text-base font-bold text-slate-900 mb-0.5">ข้อมูลการทำงาน</h2>
              <p className="text-sm text-blue-600 mb-6">บทบาทและหน้าที่ในองค์กร</p>
              <div className="grid grid-cols-2 gap-4">
                <Field label="บทบาทในระบบ">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 border border-blue-200">
                    <Shield className="w-3 h-3" />
                    {profile.role?.name || 'guest'}
                  </span>
                </Field>
                <Field label="สถานะ">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-teal-100 text-teal-700 border border-teal-300">
                    <span className="relative flex w-2 h-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-60" />
                      <span className="relative inline-flex rounded-full w-2 h-2 bg-teal-500" />
                    </span>
                    ใช้งานอยู่
                  </span>
                </Field>
                <div className="col-span-2">
                  <Field label="แผนก / คลัง">
                    {profile.departments.length > 0
                      ? profile.departments.map(d => (
                          <span key={d.id} className="inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 border border-blue-200">
                            {d.name}
                          </span>
                        ))
                      : <span className="text-slate-300">—</span>}
                  </Field>
                </div>
                <div className="col-span-2">
                  <Field label="วิชาชีพ / ตำแหน่ง">
                    {profile.profession_id || <span className="text-slate-300">—</span>}
                  </Field>
                </div>
              </div>
            </div>
          )}


        </div>
      </div>

      {showPwd && <ChangePasswordModal onClose={() => setShowPwd(false)} />}
    </div>
  );
}
