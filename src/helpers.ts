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

function hashArrayBufferToNumber(buffer: ArrayBuffer): number {
    const view = new DataView(buffer);
    let hash = 0;
    
    for (let i = 0; i < view.byteLength; i++) {
        const byte = view.getUint8(i);
        hash = (hash << 5) - hash + byte;
        hash |= 0; // Convert to 32bit integer
    }
    
    return Math.abs(hash);
}

// Function to identify rare QR codes
export function getQRCodeRarity(buffer: ArrayBuffer): Rarity {
    const maxRarity = 11;
    const hash = hashArrayBufferToNumber(buffer);
    const normalizedValue = hash / Math.pow(2, 32); // Normalize hash to a value between 0 and 1

    // Define an exponential distribution
    const probabilities: number[] = [];
    const lambda = 1.5; // Adjust this value to control the steepness of the distribution
    let totalProbability = 0;

    for (let i = 1; i <= maxRarity; i++) {
        const probability = Math.exp(-lambda * i);
        probabilities.push(probability);
        totalProbability += probability;
    }

    // Normalize probabilities so they sum to 1
    for (let i = 0; i < probabilities.length; i++) {
        probabilities[i] /= totalProbability;
    }

    // Find the rarity based on the normalized value
    let cumulativeProbability = 0;
    for (let i = 0; i < probabilities.length; i++) {
        cumulativeProbability += probabilities[i];
        if (normalizedValue < cumulativeProbability) {
            return i + 1; // Rarity is 1-indexed
        }
    }

    return maxRarity; // Fallback in case of rounding errors
}
