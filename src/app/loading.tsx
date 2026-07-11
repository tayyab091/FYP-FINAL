export default function Loading() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-full border-2 border-[#00ff87] border-t-transparent animate-spin" />
        <p className="text-[#a0a0a0] text-sm">Loading...</p>
      </div>
    </div>
  )
}
