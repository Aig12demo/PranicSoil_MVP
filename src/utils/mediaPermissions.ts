export type PermissionStatus = 'granted' | 'denied' | 'prompt' | 'unsupported';

export interface MediaPermissionResult {
  status: PermissionStatus;
  error?: string;
}

export async function checkMicrophonePermission(): Promise<MediaPermissionResult> {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return {
      status: 'unsupported',
      error: 'Your browser does not support microphone access. Please use a modern browser like Chrome, Firefox, Safari, or Edge.',
    };
  }

  if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
    return {
      status: 'denied',
      error: 'Microphone access requires a secure connection (HTTPS) or localhost.',
    };
  }

  try {
    if (navigator.permissions && navigator.permissions.query) {
      const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      return { status: permissionStatus.state as PermissionStatus };
    }
  } catch (err) {
    console.warn('Permission API not fully supported, will attempt direct access');
  }

  return { status: 'prompt' };
}

export async function requestMicrophoneAccess(): Promise<MediaPermissionResult> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach(track => track.stop());
    return { status: 'granted' };
  } catch (err) {
    if (err instanceof Error) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        return {
          status: 'denied',
          error: 'Microphone access was denied. Please allow microphone access in your browser settings and try again.',
        };
      }
      if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        return {
          status: 'denied',
          error: 'No microphone found. Please connect a microphone and try again.',
        };
      }
      if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        return {
          status: 'denied',
          error: 'Your microphone is being used by another application. Please close other applications and try again.',
        };
      }
      return {
        status: 'denied',
        error: `Microphone access error: ${err.message}`,
      };
    }
    return {
      status: 'denied',
      error: 'Failed to access microphone. Please check your browser settings.',
    };
  }
}

export function getBrowserInstructions(): { browser: string; instructions: string } {
  const userAgent = navigator.userAgent.toLowerCase();

  if (userAgent.includes('chrome') && !userAgent.includes('edg')) {
    return {
      browser: 'Chrome',
      instructions: 'Click the lock icon in the address bar, find "Microphone" and set it to "Allow".',
    };
  }

  if (userAgent.includes('firefox')) {
    return {
      browser: 'Firefox',
      instructions: 'Click the lock icon in the address bar, find "Use the Microphone" and select "Allow".',
    };
  }

  if (userAgent.includes('safari')) {
    return {
      browser: 'Safari',
      instructions: 'Go to Safari > Settings > Websites > Microphone, and allow access for this site.',
    };
  }

  if (userAgent.includes('edg')) {
    return {
      browser: 'Edge',
      instructions: 'Click the lock icon in the address bar, find "Microphone" and set it to "Allow".',
    };
  }

  return {
    browser: 'your browser',
    instructions: 'Check your browser settings to allow microphone access for this site.',
  };
}
