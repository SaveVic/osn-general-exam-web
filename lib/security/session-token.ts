import crypto from "crypto";

/**
 * Menghasilkan token sesi acak aman berbasis kriptografi (256-bit entropy)
 */
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Menghitung hash SHA-256 satu arah untuk disimpan pada basis data
 */
export function hashSessionToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Memverifikasi kecocokan antara token mentah dari cookie dan hash yang tersimpan
 */
export function verifySessionToken(token: string, expectedHash: string): boolean {
  if (!token || !expectedHash) return false;
  const computedHash = hashSessionToken(token);
  return crypto.timingSafeEqual(
    Buffer.from(computedHash, "hex"),
    Buffer.from(expectedHash, "hex")
  );
}

