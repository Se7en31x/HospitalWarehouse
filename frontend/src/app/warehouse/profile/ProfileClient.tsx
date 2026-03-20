'use client';

import { Phone, CreditCard, CalendarDays, Briefcase, MapPin, User } from 'lucide-react';

export interface UserProfile {
  titleCode:    string | null;
  firstnameTh:  string | null;
  lastnameTh:   string | null;
  firstnameEn:  string | null;
  lastnameEn:   string | null;
  phone:        string | null;
  cid:          string | null;
  birthDate:    string | null;
  professionId: string | null;
  addressDetail:string | null;
  zipCode:      number | null;
}

function formatCid(cid: string) {
  return cid.replace(/(\d{1})(\d{4})(\d{5})(\d{2})(\d{1})/, '$1-$2-$3-$4-$5');
}

export default function ProfileClient({ user }: { user: UserProfile }) {
  const fullNameTh = [user.titleCode, user.firstnameTh, user.lastnameTh].filter(Boolean).join(' ');
  const fullNameEn = [user.firstnameEn, user.lastnameEn].filter(Boolean).join(' ');

  const address = [user.addressDetail, user.zipCode ? `รหัสไปรษณีย์ ${user.zipCode}` : null].filter(Boolean).join('  ');

  const infoRows = [
    { icon: <Phone className="w-4 h-4" />,        label: 'โทรศัพท์',         value: user.phone || '-'                    },
    { icon: <CreditCard className="w-4 h-4" />,   label: 'เลขบัตรประชาชน',   value: user.cid ? formatCid(user.cid) : '-' },
    { icon: <CalendarDays className="w-4 h-4" />, label: 'วันเกิด',           value: user.birthDate || '-'                },
    { icon: <Briefcase className="w-4 h-4" />,    label: 'ตำแหน่ง/วิชาชีพ', value: user.professionId || '-'             },
    { icon: <MapPin className="w-4 h-4" />,       label: 'ที่อยู่',            value: address || '-'                       },
  ];

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-white p-8 pt-12 items-center">
      <div className="w-full max-w-xl flex flex-col gap-6">
        <h2 className="text-3xl font-bold text-gray-800 text-center">ข้อมูลของฉัน</h2>
        <div className="rounded-xl border border-slate-100 shadow-lg bg-white p-8">

          <div className="space-y-5">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 text-blue-500 flex-shrink-0"><User className="w-4 h-4" /></span>
              <div className="grid grid-cols-2 gap-x-8 gap-y-1 flex-1">
                <div>
                  <p className="text-xs text-slate-400">ชื่อ-นามสกุล (TH)</p>
                  <p className="text-sm text-slate-700 font-medium">{fullNameTh || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">ชื่อ-นามสกุล (EN)</p>
                  <p className="text-sm text-slate-700 font-medium">{fullNameEn || '-'}</p>
                </div>
              </div>
            </div>

            {infoRows.map(row => (
              <div key={row.label} className="flex items-start gap-3">
                <span className="mt-0.5 text-blue-500 flex-shrink-0">{row.icon}</span>
                <div>
                  <p className="text-xs text-slate-400">{row.label}</p>
                  <p className="text-sm text-slate-700 font-medium">{row.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}