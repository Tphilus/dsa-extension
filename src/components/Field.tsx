export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider ml-1">{label}</span>
      {children}
    </label>
  )
}
