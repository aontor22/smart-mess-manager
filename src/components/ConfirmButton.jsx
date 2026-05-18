export default function ConfirmButton({ children = "Delete", onConfirm, className = "" }) {
  const handleClick = () => {
    if (window.confirm("Are you sure you want to continue?")) onConfirm();
  };

  return (
    <button
      className={`rounded-xl px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950 ${className}`}
      onClick={handleClick}
    >
      {children}
    </button>
  );
}
