import ProfileClient, { UserProfile } from './ProfileClient';

export const dynamic = 'force-dynamic';

const MOCK_USER: UserProfile = {
  titleCode:    'นาย',
  firstnameTh:  'สมชาย',
  lastnameTh:   'ใจดี',
  firstnameEn:  'Somchai',
  lastnameEn:   'Jaidee',
  phone:        '053-123-456',
  cid:          '1100700123456',
  birthDate:    '15 มกราคม 2510',
  professionId: 'เจ้าหน้าที่คลังพัสดุ',
  addressDetail:'123 ถ.นิมมานเหมินท์ ต.สุเทพ',
  zipCode:      50200,
};

export default function ProfilePage() {
  return <ProfileClient user={MOCK_USER} />;
}