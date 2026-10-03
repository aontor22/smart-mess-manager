function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.52h3.24c1.9-1.75 2.98-4.33 2.98-7.37Z" />
      <path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.4l-3.24-2.52c-.9.6-2.05.96-3.38.96-2.6 0-4.8-1.76-5.59-4.12H3.06v2.6A10 10 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.41 13.92A6.02 6.02 0 0 1 6.1 12c0-.67.12-1.32.31-1.92v-2.6H3.06A10 10 0 0 0 2 12c0 1.61.39 3.14 1.06 4.52l3.35-2.6Z" />
      <path fill="#EA4335" d="M12 5.96c1.47 0 2.79.5 3.83 1.5l2.87-2.87C16.96 2.97 14.7 2 12 2a10 10 0 0 0-8.94 5.48l3.35 2.6C7.2 7.72 9.4 5.96 12 5.96Z" />
    </svg>
  );
}

export default function GoogleAuthButton({ onClick, disabled, label = "Continue with Google" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="btn-secondary w-full gap-3 py-2.5"
    >
      <GoogleIcon />
      {label}
    </button>
  );
}
