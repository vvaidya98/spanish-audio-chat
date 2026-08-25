export default function NavButton({ icon, label, onClick, title }) {
  return (
    <button
      onClick={onClick}
      title={title || label}
      className="min-h-[44px] px-4 py-3 rounded-control text-small font-semibold bg-primary text-white hover:bg-primary-hover transition-all duration-200 flex items-center gap-1.5 whitespace-nowrap"
    >
      {icon && <span aria-hidden="true">{icon}</span>}
      <span>{label}</span>
    </button>
  )
}
