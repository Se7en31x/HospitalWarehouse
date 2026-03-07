import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <body className="h-screen flex flex-col bg-gray-200 font-sans">
        <div className="flex flex-1 overflow-hidden">
            <main className="flex-1  overflow-y-auto">
              <div className="max-w-8xl mx-auto">{children}</div>
            </main>
        </div>
      </body>
    </html>
  );
}
