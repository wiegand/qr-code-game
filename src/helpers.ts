import { useEffect, useState, useRef } from 'preact/hooks';
import names from './names'

export type Rarity = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;

// Hash QR code data to ensure consistency
export async function hashQRCodeData(data: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  return hashBuffer;
}

// Generate a color based on the hash (for normal QR codes)
export function getColorFromHash(hashBuffer: ArrayBuffer) {
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hex = hashArray.slice(0, 3).map(byte => byte.toString(16).padStart(2, '0')).join('');
  return `#${hex}`;
}

// Generate a name based on the hash
export function getNameFromHash(hashBuffer: ArrayBuffer) {
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const index = (hashArray[0] * 256 + hashArray[1]) % names.length;
  return names[index];
}

// Generate a rainbow color for rare QR codes
export function getRainbowColor() {
  const hue = Math.floor(Math.random() * 360);  // Random hue for rainbow colors
  return `hsl(${hue}, 100%, 50%)`;
}

export function useThrottle<T>(value: T, interval = 500): T {
  const [throttledValue, setThrottledValue] = useState<T>(value)
  const lastExecuted = useRef<number>(Date.now())

  useEffect(() => {
    if (Date.now() >= lastExecuted.current + interval) {
      lastExecuted.current = Date.now()
      setThrottledValue(value)
    } else {
      const timerId = setTimeout(() => {
        lastExecuted.current = Date.now()
        setThrottledValue(value)
      }, interval)

      return () => clearTimeout(timerId)
    }
  }, [value, interval])

  return throttledValue
}

export function getQRCodeRarity(buffer: ArrayBuffer): Rarity {
  // Step 1: Generate a deterministic hash from the ArrayBuffer input
  function hashArrayBuffer(buffer) {
    let hash = 0;
    const view = new Uint8Array(buffer); // Create a byte view for the ArrayBuffer
    for (let i = 0; i < view.length; i++) {
      hash = ((hash << 5) - hash + view[i]) & 0xffffffff; // 32-bit integer
    }
    return Math.abs(hash);
  }

  // Step 2: Normalize hash based on the length of the input to ensure consistent distribution
  function normalizeHash(hash, length) {
    const baseValue = length > 0 ? hash / length : hash;
    const normalized = (baseValue % 1 + 1) / 2; // Normalize to [0, 1)
    return normalized;
  }

  // Step 3: Transform the normalized value to a number between 1 and 11 with exponential distribution
  function normalizedToNumber(normalized) {
    const exponent = 2.5; // Adjust to control distribution skew (higher means more skew to 1)
    const value = Math.pow(normalized, exponent) * 10 + 1; // Map to range [1, 11]

    return Math.min(11, Math.max(1, Math.round(value))); // Ensure value is within range 1-11
  }

  const hash = hashArrayBuffer(buffer);
  const normalizedHash = normalizeHash(hash, buffer.byteLength);
  return normalizedToNumber(normalizedHash);
}
