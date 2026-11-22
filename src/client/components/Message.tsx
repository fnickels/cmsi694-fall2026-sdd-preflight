import type { ClientErrorCode } from '../../shared/types';
import { MESSAGES } from '../messages';

export function Message({ code, onRetry }: { code: ClientErrorCode; onRetry?: () => void }) {
  return (
    <div role="alert" className="message">
      <span>{MESSAGES[code]}</span>
      {onRetry && (
        <button type="button" className="button button-secondary" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}
