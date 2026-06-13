interface StatCardProps {
  label: string
  value: string
  sub?: string
  icon?: string
}

export function StatCard({ label, value, sub, icon }: StatCardProps) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
      <div className="flex items-center gap-2 mb-1">
        {icon && <span className="text-xl">{icon}</span>}
        <span className="text-sm text-gray-500 font-medium">{label}</span>
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  )
}
