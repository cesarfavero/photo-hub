// Utilitário para gerenciar identidade anônima de dispositivo por evento
// Usa UUID aleatório no localStorage + hash SHA-256 para enviar ao servidor

const STORAGE_PREFIX = "ph_device_";

function getStorageKey(eventId: string): string {
  return `${STORAGE_PREFIX}${eventId}`;
}

export function getDeviceToken(eventId: string): string {
  const key = getStorageKey(eventId);
  let token = localStorage.getItem(key);
  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem(key, token);
  }
  return token;
}

export async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function getDeviceTokenHash(eventId: string): Promise<string> {
  const token = getDeviceToken(eventId);
  return hashToken(token);
}

export function clearDeviceToken(eventId: string): void {
  localStorage.removeItem(getStorageKey(eventId));
}
