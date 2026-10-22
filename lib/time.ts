/**
 * Utilitas Terpusat Pengelolaan Zona Waktu Indonesia Barat (WIB / Asia/Jakarta)
 *
 * Menjamin konsistensi pembentukan, pemformatan, dan penyimpanan waktu
 * antara peramban klien, Server Actions Next.js, dan PostgreSQL Supabase.
 */

export const TIMEZONE_WIB = "Asia/Jakarta";
export const WIB_OFFSET = "+07:00";
export const WIB_OFFSET_HOURS = 7;
export const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

function pad(n: number, len = 2): string {
  return n.toString().padStart(len, "0");
}

/**
 * Mengonversi objek Date menjadi ISO 8601 string dengan offset eksplisit +07:00.
 * Contoh output: "2026-10-22T14:40:08.123+07:00"
 */
export function formatWIBIsoString(date: Date = new Date()): string {
  if (isNaN(date.getTime())) {
    throw new RangeError("Invalid Date passed to formatWIBIsoString");
  }

  // Karena WIB selalu UTC+7 tanpa daylight saving time (DST),
  // menambahkan offset 7 jam ke UTC timestamp memproyeksikan komponen tanggal/jam ke WIB.
  const wibShifted = new Date(date.getTime() + WIB_OFFSET_MS);

  const year = wibShifted.getUTCFullYear();
  const month = pad(wibShifted.getUTCMonth() + 1);
  const day = pad(wibShifted.getUTCDate());
  const hours = pad(wibShifted.getUTCHours());
  const minutes = pad(wibShifted.getUTCMinutes());
  const seconds = pad(wibShifted.getUTCSeconds());
  const ms = pad(wibShifted.getUTCMilliseconds(), 3);

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${ms}${WIB_OFFSET}`;
}

/**
 * Mengembalikan waktu saat ini dalam format ISO 8601 dengan offset +07:00.
 */
export function getNowWIBIsoString(): string {
  return formatWIBIsoString(new Date());
}

/**
 * Mengonversi input string dari formulir HTML (misalnya "2026-10-22T14:30")
 * menjadi string ISO 8601 terkualifikasi dengan offset +07:00 ("2026-10-22T14:30:00.000+07:00").
 * Jika input sudah memiliki penanda timezone (seperti 'Z' atau offset numerik),
 * nilainya diproyeksikan ke waktu WIB.
 */
export function parseDateTimeInputWIB(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";

  // Jika string sudah memiliki penanda timezone (Z, +XX:XX, -XX:XX)
  if (/[Zz]$|[+-]\d{2}(?::?\d{2})?$/.test(trimmed)) {
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      return formatWIBIsoString(parsed);
    }
  }

  // Format lokal input datetime-local: YYYY-MM-DDTHH:mm atau YYYY-MM-DDTHH:mm:ss
  const match = trimmed.match(
    /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?(?:\.(\d+))?$/
  );
  if (match) {
    const [, year, month, day, hours, minutes, seconds = "00", ms = "000"] = match;
    const formattedMs = ms.padEnd(3, "0").slice(0, 3);
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${formattedMs}${WIB_OFFSET}`;
  }

  // Fallback ke Date standar
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    return formatWIBIsoString(parsed);
  }

  return trimmed;
}

/**
 * Mengonversi timestamp dari database (format ISO UTC atau ber-offset)
 * menjadi format yang sesuai untuk value <input type="datetime-local"> ("YYYY-MM-DDTHH:mm")
 * yang diproyeksikan tepat ke zona waktu Asia/Jakarta.
 */
export function toWIBInputString(dateInput?: string | Date | null): string {
  if (!dateInput) return "";
  const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return "";

  const wibShifted = new Date(d.getTime() + WIB_OFFSET_MS);
  const year = wibShifted.getUTCFullYear();
  const month = pad(wibShifted.getUTCMonth() + 1);
  const day = pad(wibShifted.getUTCDate());
  const hours = pad(wibShifted.getUTCHours());
  const minutes = pad(wibShifted.getUTCMinutes());

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Memformat tanggal ke teks tampilan ramah pengguna bahasa Indonesia
 * yang terikat secara ketat pada zona waktu Asia/Jakarta (WIB).
 */
export function formatWIBDateTime(
  dateInput: string | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!dateInput) return "-";
  const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    timeZone: TIMEZONE_WIB,
    ...options,
  }).format(d);
}

