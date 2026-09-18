/**
 * Global error suppressor for normal WebRTC and Daily.co meeting conclusion / ejection events.
 * 
 * When a Vapi voice call finishes, Daily.co WebRTC emits an ejection notification 
 * ('Meeting ended due to ejection: Meeting has ended'). Vapi SDK's internal cleanup() 
 * catches and forwards this to console.error, causing false positive error alarms.
 * This module ensures such normal teardown notifications are handled gracefully without 
 * registering as application errors.
 */

export function isMeetingEndedError(err: any): boolean {
  if (!err) return false;

  // Direct object inspection
  if (typeof err === 'object') {
    if (err.type === 'daily-error') {
      const msg = err.error?.message?.msg || err.error?.errorMsg || err.error?.msg || '';
      const type = err.error?.message?.type || err.error?.error?.type || '';
      if (
        type === 'ejected' ||
        /meeting\s+(has\s+)?ended/i.test(msg) ||
        /ejected/i.test(type) ||
        /meeting\s+ended/i.test(err.error?.errorMsg || '')
      ) {
        return true;
      }
    }

    if (err.type === 'ejected') return true;
    if (err.action === 'error' && /meeting\s+(has\s+)?ended/i.test(err.errorMsg || '')) return true;

    if (typeof err.message === 'string' && (/meeting\s+(has\s+)?ended/i.test(err.message) || /ejected/i.test(err.message))) {
      return true;
    }
  }

  // String / Error instance inspection
  let raw = '';
  if (typeof err === 'string') {
    raw = err;
  } else if (err instanceof Error) {
    raw = `${err.name}: ${err.message}\n${err.stack || ''}`;
  } else {
    try {
      raw = JSON.stringify(err);
    } catch {
      raw = String(err);
    }
  }

  const lower = raw.toLowerCase();
  return (
    lower.includes('meeting has ended') ||
    lower.includes('meeting ended') ||
    lower.includes('meeting ended due to ejection') ||
    lower.includes('due to ejection') ||
    (lower.includes('ejected') && (lower.includes('meeting') || lower.includes('call'))) ||
    lower.includes('"type":"ejected"') ||
    lower.includes('participant has been ejected') ||
    lower.includes('room was closed') ||
    lower.includes('left-meeting') ||
    lower.includes('participant-left')
  );
}

export function initGlobalErrorSuppression() {
  if (typeof window === 'undefined') return;

  // 1. Filter out known meeting teardown / ejection errors from console.error
  const origConsoleError = console.error;
  console.error = (...args: any[]) => {
    const isEjection = args.some((arg) => isMeetingEndedError(arg));
    if (isEjection) {
      console.info('Handled normal voice meeting conclusion / ejection:', ...args);
      return;
    }
    origConsoleError.apply(console, args);
  };

  // 2. Suppress unhandled window error events for normal meeting ejection
  window.addEventListener(
    'error',
    (event: ErrorEvent) => {
      if (isMeetingEndedError(event.error) || isMeetingEndedError(event.message)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return true;
      }
    },
    true
  );

  // 3. Suppress unhandled promise rejections for normal meeting ejection
  window.addEventListener(
    'unhandledrejection',
    (event: PromiseRejectionEvent) => {
      if (isMeetingEndedError(event.reason)) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },
    true
  );
}
