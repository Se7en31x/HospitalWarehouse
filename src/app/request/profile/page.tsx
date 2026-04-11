import ProfileClient from '@/app/warehouse/profile/ProfileClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'ข้อมูลของฉัน',
};

export default function RequestProfilePage() {
  return <ProfileClient />;
}
