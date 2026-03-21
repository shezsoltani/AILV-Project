import { getPasswordStrength } from '../utils/passwordStrength';

interface PasswordStrengthMeterProps {
  password: string;
  // Präfix für stabile DOM-Ids (z. B. aria-describedby)
  idPrefix: string;
}

// Zeigt Passwort-Stärke und kurze Tipps – nur sichtbar, sobald etwas eingegeben wurde
export function PasswordStrengthMeter({ password, idPrefix }: PasswordStrengthMeterProps) {
  if (password.length === 0) {
    return null;
  }

  const { level, label, segmentsFilled, suggestions } = getPasswordStrength(password);
  const containerId = `${idPrefix}-password-strength`;
  const liveId = `${idPrefix}-password-strength-live`;

  return (
    <div id={containerId} className={`password-strength password-strength--${level}`}>
      <div className="password-strength-bars" role="presentation" aria-hidden>
        {[0, 1, 2].map((index) => (
          <span
            key={index}
            className={`password-strength-bar${
              index < segmentsFilled ? ' password-strength-bar--filled' : ''
            }`}
          />
        ))}
      </div>
      <p id={liveId} className="password-strength-label" aria-live="polite">
        Passwort-Stärke: <strong>{label}</strong>
      </p>
      {suggestions.length > 0 && (
        <ul className="password-strength-tips">
          {suggestions.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
