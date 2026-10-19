/* eslint-disable tailwindcss/no-custom-classname */
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const HUMAN_FRIENDLY_CHARS = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

/**
 * Generator kode rujukan acak yang ramah bacaan manusia (tanpa karakter ambigu 0/O, 1/I/L)
 */
export function generateRandomCode(prefix?: string): string {
  const getRandomPart = (len: number) => {
    let res = "";
    for (let i = 0; i < len; i++) {
      const idx = Math.floor(Math.random() * HUMAN_FRIENDLY_CHARS.length);
      res += HUMAN_FRIENDLY_CHARS[idx];
    }
    return res;
  };

  const cleanPrefix = prefix
    ? prefix
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .slice(0, 6)
    : "REF";

  return `${cleanPrefix}-${getRandomPart(4)}`;
}

