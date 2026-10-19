import { describe, it, expect } from "vitest";
import { cn, generateRandomCode } from "@/lib/utils";
import {
  generateSessionToken,
  hashSessionToken,
  verifySessionToken,
} from "@/lib/security/session-token";

describe("F0-01 & F1-05: Utilitas Sistem (lib/utils.ts)", () => {
  describe("cn() - Penggabungan Kelas Tailwind CSS", () => {
    it("menggabungkan kelas-kelas dasar dengan benar", () => {
      expect(cn("bg-white", "text-slate-900")).toBe("bg-white text-slate-900");
    });

    it("mengabaikan nilai kondisional falsy (false, null, undefined)", () => {
      expect(cn("flex", false && "hidden", null, undefined, "font-bold")).toBe(
        "flex font-bold"
      );
    });

    it("menyelesaikan konflik utilitas Tailwind secara deterministik (tailwind-merge)", () => {
      expect(cn("px-2 py-1", "px-4")).toBe("py-1 px-4");
      expect(cn("bg-indigo-500", "bg-indigo-600")).toBe("bg-indigo-600");
    });
  });

  describe("generateRandomCode() - Generator Kode Rujukan Ramah Manusia", () => {
    it("menghasilkan format default REF-XXXX ketika tanpa prefix", () => {
      const code = generateRandomCode();
      expect(code).toMatch(/^REF-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{4}$/);
    });

    it("membersihkan karakter non-alfanumerik dan memotong prefix maksimal 6 karakter", () => {
      const code = generateRandomCode("osn_2026_informatika!");
      expect(code).toMatch(/^OSN202-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{4}$/);
    });

    it("tidak pernah menghasilkan karakter ambigu (0, O, 1, I) dalam 500 iterasi", () => {
      const ambiguousPattern = /[0O1I]/;
      for (let i = 0; i < 500; i++) {
        const code = generateRandomCode("MAT");
        const suffix = code.split("-")[1];
        expect(suffix).toHaveLength(4);
        expect(suffix).not.toMatch(ambiguousPattern);
      }
    });
  });
});

describe("F3-01: Keamanan Kriptografi Token Sesi (lib/security/session-token.ts)", () => {
  it("generateSessionToken() menghasilkan string hex 64 karakter (256-bit entropy) yang unik", () => {
    const token1 = generateSessionToken();
    const token2 = generateSessionToken();

    expect(token1).toMatch(/^[a-f0-9]{64}$/);
    expect(token2).toMatch(/^[a-f0-9]{64}$/);
    expect(token1).not.toBe(token2);
  });

  it("hashSessionToken() menghasilkan digest SHA-256 deterministik 64 karakter", () => {
    const rawToken = "contoh-token-rahasia-ujian-osn-2026";
    const hash1 = hashSessionToken(rawToken);
    const hash2 = hashSessionToken(rawToken);

    expect(hash1).toMatch(/^[a-f0-9]{64}$/);
    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(rawToken);
  });

  it("verifySessionToken() memvalidasi kecocokan token dengan timingSafeEqual secara akurat", () => {
    const token = generateSessionToken();
    const validHash = hashSessionToken(token);
    const wrongHash = hashSessionToken("token-lain");

    expect(verifySessionToken(token, validHash)).toBe(true);
    expect(verifySessionToken(token, wrongHash)).toBe(false);
    expect(verifySessionToken("token-palsu", validHash)).toBe(false);
  });

  it("verifySessionToken() menangani input kosong atau hash rusak tanpa melempar RangeError", () => {
    const token = generateSessionToken();
    expect(verifySessionToken("", "abc")).toBe(false);
    expect(verifySessionToken(token, "")).toBe(false);
    expect(verifySessionToken(token, "hash-pendek-tidak-valid")).toBe(false);
    expect(verifySessionToken(token, "zzzz")).toBe(false);
  });
});

