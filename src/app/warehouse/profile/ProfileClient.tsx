'use client';

import { useEffect, useState } from 'react';
import {
  UserCircle2,
  Copy,
  Check,
  Phone,
  Briefcase,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { getProfile, type UserProfile } from '@/services/profileService';

/* ─── helpers ───────────────────────────────────────────────── */

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handle = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* silent */ }
  };
  return (
    <button
      onClick={handle}
      title="คัดลอก"
      className="ml-1.5 p-0.5 rounded text-slate-400 hover:text-emerald-700 transition-colors"
    >
      {copied
        ? <Check className="w-3.5 h-3.5 text-emerald-600" />
        : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

function formatCid(cid: string) {
  return cid.replace(/(\d{1})(\d{4})(\d{5})(\d{2})(\d{1})/, '$1-$2-$3-$4-$5');
}

function SectionHeading({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-emerald-700">{icon}</span>
      <h3 className="text-xs font-semibold uppercase tracking-widest text-emerald-700">{label}</h3>
    </div>
  );
}

function Row({ label, value, extra }: { label: string; value: React.ReactNode; extra?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] text-slate-400 font-medium">{label}</span>
      <div className="flex items-center text-sm text-slate-700 font-medium">
        {value || <span className="text-slate-300">-</span>}
        {extra}
      </div>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col gap-4">
      {children}
    </div>
  );
}

const roleColor = (name: string) => {
  const n = (name || '').toLowerCase();
  if (n === 'admin')    return 'bg-blue-900 text-white';
  if (n === 'manager')  return 'bg-blue-700 text-white';
  return 'bg-slate-100 text-slate-600';
};

/* ─── main component ─────────────────────────────────────────── */

export default function ProfileClient() {
  const [profile,   setProfile]   = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error,     setError]     = useState<string | null>(null);

  useEffect(() => {
    getProfile()
      .then(setProfile)
      .catch((e) => setError(e?.message || 'โหลดข้อมูลล้มเหลว'))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-sm text-slate-400 animate-pulse">กำลังโหลด...</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-sm text-red-500">{error || 'ไม่พบข้อมูลโปรไฟล์'}</p>
      </div>
    );
  }

  const fullNameTh = [profile.title?.short_name, profile.firstname_th, profile.lastname_th]
    .filter(Boolean).join(' ');
  const fullNameEn = [profile.firstname_en, profile.lastname_en].filter(Boolean).join(' ');

  const fullAddress = [
    profile.address.detail,
    profile.address.subdistrict ? `ต.${profile.address.subdistrict}` : null,
    profile.address.district    ? `อ.${profile.address.district}`    : null,
    profile.address.province    ? `จ.${profile.address.province}`    : null,
    profile.address.zip_code    ? String(profile.address.zip_code)   : null,
  ].filter(Boolean).join(' ');

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="max-w-4xl mx-auto flex flex-col gap-6">

        {/* ── Header ── */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col sm:flex-row items-center gap-6">
          <div className="flex-shrink-0 text-slate-300">
            <UserCircle2 className="w-20 h-20" strokeWidth={1} />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h1 className="text-2xl font-bold text-slate-800">
              {fullNameTh || profile.email || 'ผู้ใช้งาน'}
            </h1>
            {fullNameEn && (
              <p className="text-sm text-slate-500 mt-0.5">{fullNameEn}</p>
            )}
            <div className="flex flex-wrap gap-2 mt-3 justify-center sm:justify-start">
              <span className={`text-xs font-semibold px-3 py-1 rounded-full ${roleColor(profile.role?.name)}`}>
                {profile.role?.name || 'guest'}
              </span>
              {profile.departments.map((d) => (
                <span
                  key={d.id}
                  className="text-xs font-medium px-3 py-1 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-800"
                >
                  {d.name}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* ── 2-column grid ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

          {/* ── Personal Info ── */}
          <Card>
            <SectionHeading icon={<Users className="w-4 h-4" />} label="ข้อมูลส่วนตัว" />
            <Row label="คำนำหน้า"      value={profile.title?.name} />
            <Row label="ชื่อ-นามสกุล (TH)" value={fullNameTh || null} />
            <Row label="ชื่อ-นามสกุล (EN)" value={fullNameEn || null} />
            <Row label="เพศ"           value={profile.sex?.name} />
            <Row
              label="วันเกิด"
              value={profile.birth_date}
              extra={
                profile.age != null
                  ? <span className="ml-2 text-xs text-slate-400">({profile.age} ปี)</span>
                  : null
              }
            />
            <Row
              label="เลขบัตรประชาชน"
              value={profile.cid ? formatCid(profile.cid) : null}
              extra={profile.cid ? <CopyButton text={profile.cid} /> : null}
            />
            <Row label="สัญชาติ"       value={profile.nationality} />
            <Row label="เชื้อชาติ"      value={profile.race} />
          </Card>

          {/* ── Contact ── */}
          <Card>
            <SectionHeading icon={<Phone className="w-4 h-4" />} label="ช่องทางติดต่อ" />
            <Row label="โทรศัพท์" value={profile.phone} />
            <Row
              label="อีเมล"
              value={profile.email}
              extra={profile.email ? <CopyButton text={profile.email} /> : null}
            />
            <Row label="ที่อยู่" value={fullAddress || null} />
          </Card>

          {/* ── Work Identity ── */}
          <Card>
            <SectionHeading icon={<Briefcase className="w-4 h-4" />} label="ข้อมูลการทำงาน" />
            <Row label="วิชาชีพ / ตำแหน่ง" value={profile.profession_id} />
            <Row label="บทบาทในระบบ" value={profile.role?.name} />
            {profile.departments.length > 0 && (
              <div className="flex flex-col gap-0.5">
                <span className="text-[11px] text-slate-400 font-medium">แผนก</span>
                <div className="flex flex-wrap gap-1.5 mt-0.5">
                  {profile.departments.map((d) => (
                    <span
                      key={d.id}
                      className="text-xs px-2.5 py-0.5 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-800 font-medium"
                    >
                      {d.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <Row
              label="รหัสผู้ใช้ (UUID)"
              value={
                <span className="font-mono text-xs truncate max-w-[200px]" title={profile.id ?? ''}>
                  {profile.id ?? '-'}
                </span>
              }
              extra={profile.id ? <CopyButton text={profile.id} /> : null}
            />
          </Card>

          {/* ── Account Info ── */}
          <Card>
            <SectionHeading icon={<ShieldCheck className="w-4 h-4" />} label="ข้อมูลบัญชี" />
            <Row label="อีเมล (บัญชี)" value={profile.email}
              extra={profile.email ? <CopyButton text={profile.email} /> : null}
            />
            <Row label="วันที่ลงทะเบียน" value={profile.created_at} />
          </Card>

        </div>
      </div>
    </div>
  );
}
