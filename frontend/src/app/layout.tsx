import "./globals.css";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <body className="h-screen flex flex-col bg-gray-100 font-sans">
        {/* ✅ Navbar อยู่บนสุด */}
        <Navbar />

        {/* ✅ Sidebar + Content */}
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
            <main className="flex-1 p-6 overflow-y-auto">
              <div className="max-w-8xl mx-auto">{children}</div>
            </main>
        </div>
      </body>
    </html>
  );
}
