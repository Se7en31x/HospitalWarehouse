"use client";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";

export default function Loading() {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-white z-50">
      <DotLottieReact
        src="https://lottie.host/embed/50197ea7-8a57-448a-b3ef-b6bd2722fa07/TBa7UxyEPE.lottie"
        loop
        autoplay
        style={{ width: 220, height: 220 }}
      />
      <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin mt-1" />
      <p className="text-xs text-slate-400 mt-3">กรุณารอสักครู่...</p>
    </div>
  );
}