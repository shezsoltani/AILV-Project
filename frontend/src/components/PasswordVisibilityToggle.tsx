interface PasswordVisibilityToggleProps {
  isVisible: boolean;
  onToggle: () => void;
  showLabel?: string;
  hideLabel?: string;
}

export function PasswordVisibilityToggle({
  isVisible,
  onToggle,
  showLabel = 'Passwort anzeigen',
  hideLabel = 'Passwort verbergen',
}: PasswordVisibilityToggleProps) {
  const label = isVisible ? hideLabel : showLabel;

  return (
    <button
      type="button"
      className="password-toggle-button"
      onClick={onToggle}
      aria-label={label}
      aria-pressed={isVisible}
    >
      {isVisible ? (
        <svg className="password-toggle-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M3 3l18 18M10.58 10.58a2 2 0 102.83 2.83M9.88 5.09A10.94 10.94 0 0112 5c6 0 9.5 7 9.5 7a18.95 18.95 0 01-4.04 4.87M6.61 6.61A19.2 19.2 0 002.5 12s3.5 7 9.5 7a10.9 10.9 0 005.39-1.39"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        <svg className="password-toggle-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7z"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle
            cx="12"
            cy="12"
            r="3"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
        </svg>
      )}
      <span className="sr-only">{label}</span>
    </button>
  );
}
