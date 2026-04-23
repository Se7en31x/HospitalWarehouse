import NotificationCenterClient from "@/components/notifications/NotificationCenterClient";

export const dynamic = 'force-dynamic';

export default function NotificationsPage() {
  return <NotificationCenterClient title="การแจ้งเตือนคลัง" entityType="WAREHOUSE" />;
}