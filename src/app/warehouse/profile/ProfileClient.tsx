'use client';

import { useEffect, useState } from 'react';
import {
  User, Mail, Phone, Shield, MapPin, Briefcase,
  Building2, Copy, Check, Pencil, Lock, Eye, EyeOff,
  Loader2, CheckCircle2, AlertCircle, CalendarDays,
  CreditCard, Globe, X,
} from 'lucide-react';
import { getMyProfile, type UserProfile } from '@/services/profileService';
import { createClient } from '@/lib/supabase/client';

/* ─── helpers ─────────────────────────────────────────────────── */

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
    <button onClick={handle} title="คัดลอก" className="ml-2 p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

interface RowProps {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}
function Row({ icon, label, children }: RowProps) {
  return (
    <div className="flex items-start gap-4 py-4 border-b border-slate-50 last:border-0">
      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 mt-0.5">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">{label}</p>
        <div className="text-sm font-semibold text-slate-900 flex items-center flex-wrap gap-1.5">
          {children}
        </div>
      </div>
    </div>
  );
}

function Card({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
      <div className="flex items-center gap-2.5 px-6 py-4 border-b border-slate-100">
        <span className="text-blue-600">{icon}</span>
        <h3 className="text-sm font-bold text-slate-800">{title}</h3>
      </div>
      <div className="px-6 py-2">{children}</div>
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
    <div className="min-h-screen bg-slate-50 animate-pulse">
      <div className="h-40 bg-gradient-to-br from-slate-100 to-blue-50" />
      <div className="max-w-2xl mx-auto px-6 py-8 flex flex-col gap-5">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white rounded-2xl border border-slate-100 h-40" />
        ))}
      </div>
    </div>
  );
}

/* ─── Main ─────────────────────────────────────────────────────── */

export default function ProfileClient() {
  const [profile,  setProfile]  = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [showPwd,  setShowPwd]  = useState(false);

  useEffect(() => {
    getMyProfile()
      .then(setProfile)
      .catch((e: unknown) => setError((e as { message?: string })?.message || 'โหลดข้อมูลล้มเหลว'))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) return <Skeleton />;
  if (error || !profile) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <AlertCircle className="w-8 h-8 text-red-400" />
          <p className="text-sm font-semibold text-red-500">{error || 'ไม่พบข้อมูลโปรไฟล์'}</p>
        </div>
      </div>
    );
  }

  const fullNameTh = [profile.firstname_th, profile.lastname_th].filter(Boolean).join(' ');
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

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── Header Banner ── */}
      <div className="bg-gradient-to-br from-slate-50 via-white to-blue-50/60 border-b border-slate-100">
        <div className="max-w-2xl mx-auto px-6 py-8 flex items-center justify-between gap-6">
          {/* Avatar + Name */}
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-2xl font-extrabold text-white shadow-md flex-shrink-0 ring-4 ring-blue-100">
              {avatarLetter}
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 leading-tight">{fullNameWithTitle || 'ผู้ใช้งาน'}</h1>
              {fullNameEn && <p className="text-sm text-slate-500 mt-0.5 font-medium">{fullNameEn}</p>}
              <div className="mt-2">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                  <Shield className="w-3 h-3" />
                  {profile.role?.name || 'guest'}
                </span>
              </div>
            </div>
          </div>

          {/* Edit button — disabled/read-only */}
          <button
            disabled
            className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-sm font-semibold text-slate-400 cursor-not-allowed shadow-sm select-none"
            title="ไม่สามารถแก้ไขได้ในขณะนี้"
          >
            <Pencil className="w-4 h-4" />
            แก้ไขโปรไฟล์
          </button>
        </div>
      </div>

      {/* ── Cards ── */}
      <div className="max-w-2xl mx-auto px-6 py-7 flex flex-col gap-5">

        {/* Card 1 — Personal Info */}
        <Card title="ข้อมูลส่วนตัว" icon={<User className="w-4 h-4" />}>
          <Row icon={<User className="w-3.5 h-3.5" />} label="คำนำหน้า">
            {profile.title?.name || <span className="text-slate-300">—</span>}
          </Row>
          <Row icon={<User className="w-3.5 h-3.5" />} label="ชื่อ-นามสกุล (ไทย)">
            {fullNameTh || <span className="text-slate-300">—</span>}
          </Row>
          <Row icon={<Globe className="w-3.5 h-3.5" />} label="Full Name (English)">
            {fullNameEn || <span className="text-slate-300">—</span>}
          </Row>
          <Row icon={<User className="w-3.5 h-3.5" />} label="เพศ">
            {profile.sex?.name || <span className="text-slate-300">—</span>}
          </Row>
          <Row icon={<CalendarDays className="w-3.5 h-3.5" />} label="วันเกิด">
            {profile.birth_date
              ? <>{profile.birth_date}{profile.age != null && <span className="text-xs text-slate-500 font-normal">({profile.age} ปี)</span>}</>
              : <span className="text-slate-300">—</span>}
          </Row>
          <Row icon={<CreditCard className="w-3.5 h-3.5" />} label="เลขบัตรประชาชน">
            {profile.cid
              ? <span className="font-mono tracking-widest text-slate-700">{maskCid(profile.cid)}</span>
              : <span className="text-slate-300">—</span>}
          </Row>
        </Card>

        {/* Card 2 — Work Info */}
        <Card title="ข้อมูลการทำงาน" icon={<Briefcase className="w-4 h-4" />}>
          <Row icon={<Shield className="w-3.5 h-3.5" />} label="บทบาทในระบบ">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 border border-blue-200">
              <Shield className="w-3 h-3" />
              {profile.role?.name || 'guest'}
            </span>
          </Row>
          <Row icon={<Building2 className="w-3.5 h-3.5" />} label="แผนก / คลัง">
            {profile.departments.length > 0
              ? profile.departments.map(d => (
                  <span key={d.id} className="inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {d.name}
                  </span>
                ))
              : <span className="text-slate-300">—</span>}
          </Row>
          <Row icon={<Briefcase className="w-3.5 h-3.5" />} label="วิชาชีพ / ตำแหน่ง">
            {profile.profession_id || <span className="text-slate-300">—</span>}
          </Row>
          <Row icon={<CheckCircle2 className="w-3.5 h-3.5" />} label="สถานะ">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Active
            </span>
          </Row>
        </Card>

        {/* Card 3 — Contact */}
        <Card title="ช่องทางติดต่อ" icon={<Phone className="w-4 h-4" />}>
          <Row icon={<Phone className="w-3.5 h-3.5" />} label="โทรศัพท์">
            {profile.phone || <span className="text-slate-300">—</span>}
          </Row>
          <Row icon={<Mail className="w-3.5 h-3.5" />} label="อีเมล">
            {profile.email
              ? <>{profile.email}<CopyButton text={profile.email} /></>
              : <span className="text-slate-300">—</span>}
          </Row>
          <Row icon={<MapPin className="w-3.5 h-3.5" />} label="ที่อยู่">
            {profile.address.detail || fullAddress
              ? <span className="leading-relaxed">{[profile.address.detail, fullAddress].filter(Boolean).join(' ')}</span>
              : <span className="text-slate-300">—</span>}
          </Row>
        </Card>

        {/* Card 4 — Account Security */}
        <Card title="ความปลอดภัยของบัญชี" icon={<Lock className="w-4 h-4" />}>
          <Row icon={<Mail className="w-3.5 h-3.5" />} label="อีเมลบัญชี (Supabase Auth)">
            {profile.email
              ? <>{profile.email}<CopyButton text={profile.email} /></>
              : <span className="text-slate-300">—</span>}
          </Row>
          <Row icon={<CalendarDays className="w-3.5 h-3.5" />} label="วันที่ลงทะเบียน">
            {joinedDate || <span className="text-slate-300">—</span>}
          </Row>
          <div className="pb-4 pt-1">
            <button
              onClick={() => setShowPwd(true)}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-sm"
            >
              <Lock className="w-4 h-4" />
              เปลี่ยนรหัสผ่าน
            </button>
          </div>
        </Card>

      </div>

      {showPwd && <ChangePasswordModal onClose={() => setShowPwd(false)} />}
    </div>
  );
}
