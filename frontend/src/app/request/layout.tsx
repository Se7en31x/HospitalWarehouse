import RequestNavbar from '@/components/layouts/RequestNavbar';
import RequestSidebar from '@/components/layouts/RequestSidebar';

export default function RequestsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50 text-slate-900">
      <RequestSidebar />
      <div className="flex flex-col flex-1 overflow-hidden w-full">
        <RequestNavbar />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}