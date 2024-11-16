import names from './names'

// Hash QR code data to ensure consistency
export async function hashQRCodeData(data) {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  return hashBuffer;
}

// Generate a color based on the hash (for normal QR codes)
export function getColorFromHash(hashBuffer) {
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hex = hashArray.slice(0, 3).map(byte => byte.toString(16).padStart(2, '0')).join('');
  return `#${hex}`;
}

// Generate a name based on the hash
export function getNameFromHash(hashBuffer) {
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const index = (hashArray[0] * 256 + hashArray[1]) % names.length;
  return names[index];
}

// Function to identify rare QR codes
export function isRareQRCode(hashBuffer) {
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const value = hashArray.reduce((acc, byte) => acc + byte, 0);
  return value < 2000;  // You can adjust the threshold based on how rare you want it to be
}

// Generate a rainbow color for rare QR codes
export function getRainbowColor() {
  const hue = Math.floor(Math.random() * 360);  // Random hue for rainbow colors
  return `hsl(${hue}, 100%, 50%)`;
}

