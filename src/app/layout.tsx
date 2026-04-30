import type { Metadata } from "next";
import { Prompt } from "next/font/google";
import "./globals.css";

export const metadata: Metadata = {
  title: "ระบบจัดการแผนกคลังหลักโรงพยาบาล",
  icons: {
    icon: "https://res.cloudinary.com/dgoxbpj1j/image/upload/v1773921237/logo-removebg-preview_frzye8.png",
  },
};

const prompt = Prompt({
  subsets: ["latin", "thai"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-prompt",
  display: "swap",
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th" className={prompt.variable}>
      <body className={`h-screen flex flex-col bg-gray-200 font-prompt ${prompt.className}`}>
        <div className="flex flex-1 overflow-hidden">
            <main className="flex-1  overflow-y-auto">
              <div className="w-full min-w-0 min-h-0 flex flex-col">{children}</div>
            </main>
        </div>
      </body>
    </html>
  );
}
