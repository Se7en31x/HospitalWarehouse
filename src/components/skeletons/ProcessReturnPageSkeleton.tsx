"use client";

/** โครงหน้าตรวจรับคืน (returns-department/process) ขณะโหลดรายละเอียด */
export function ProcessReturnPageSkeleton() {
  const bar = "animate-pulse rounded-md bg-slate-200/90";
  return (
    <div
      className="flex flex-col min-h-screen bg-[#fafafa]"
      aria-busy="true"
      aria-live="polite"
      aria-label="กำลังโหลดข้อมูลใบคำขอ"
    >
      <span className="sr-only">กำลังโหลดข้อมูลใบคำขอ</span>
      <div className="w-full px-6 py-6 flex flex-col flex-1">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className={`h-11 w-11 shrink-0 rounded-lg ${bar}`} />
            <div className="space-y-2 min-w-0">
              <div className={`h-8 w-40 sm:w-48 ${bar}`} />
              <div className={`h-4 w-full max-w-xl ${bar}`} />
            </div>
          </div>
          <div className={`h-9 w-24 rounded-lg ${bar} self-start sm:self-auto shrink-0`} />
        </div>

        <div className="space-y-4 flex-1">
          <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 space-y-2">
              <div className={`h-5 w-44 ${bar}`} />
              <div className={`h-3 w-56 ${bar}`} />
            </div>
            <div className="px-5 py-5 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-x-6 gap-y-5">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className={`h-3 w-14 ${bar}`} />
                  <div className={`h-4 w-full max-w-[6.5rem] ${bar}`} />
                </div>
              ))}
            </div>
          </section>

          <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 space-y-2">
              <div className={`h-5 w-40 ${bar}`} />
              <div className={`h-3 w-28 ${bar}`} />
            </div>
            <div className="px-3 py-3">
              <div className="rounded-lg border border-slate-100 overflow-hidden">
                <div className="grid grid-cols-[44px_140px_120px_1fr_150px_min(26%,12rem)] gap-2 bg-slate-50 px-3 py-2.5 border-b border-slate-200">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className={`h-3 ${bar}`} />
                  ))}
                </div>
                <div className="divide-y divide-slate-100">
                  {Array.from({ length: 5 }).map((_, row) => (
                    <div
                      key={row}
                      className="grid grid-cols-[44px_140px_120px_1fr_150px_min(26%,12rem)] gap-2 px-3 py-3 items-center"
                    >
                      <div className={`h-4 w-4 mx-auto ${bar}`} />
                      <div className={`h-4 w-full ${bar}`} />
                      <div className={`h-4 w-full ${bar}`} />
                      <div className={`h-4 w-full max-w-[14rem] ${bar}`} />
                      <div className={`h-9 w-full rounded-lg ${bar}`} />
                      <div className={`h-10 w-full rounded-lg ${bar}`} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 space-y-2">
              <div className={`h-5 w-48 ${bar}`} />
              <div className={`h-3 w-full max-w-lg ${bar}`} />
            </div>
            <div className="px-5 py-4 space-y-4">
              <div className={`h-[5.25rem] w-full rounded-lg ${bar}`} />
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between pt-3 border-t border-slate-100">
                <div className={`h-3 w-full max-w-md ${bar}`} />
                <div className={`h-9 w-44 rounded-lg ${bar} shrink-0 sm:ml-auto`} />
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
