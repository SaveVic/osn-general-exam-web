import { describe, expect, it } from "vitest";
import {
  TIMEZONE_WIB,
  WIB_OFFSET,
  formatWIBIsoString,
  getNowWIBIsoString,
  parseDateTimeInputWIB,
  toWIBInputString,
  formatWIBDateTime,
} from "@/lib/time";
import { formatReportTimestamp } from "@/lib/exam/report-csv";

describe("WIB Timezone Utilities (lib/time.ts)", () => {
  describe("Constants", () => {
    it("defines Asia/Jakarta and +07:00 offset", () => {
      expect(TIMEZONE_WIB).toBe("Asia/Jakarta");
      expect(WIB_OFFSET).toBe("+07:00");
    });
  });

  describe("formatWIBIsoString & getNowWIBIsoString", () => {
    it("formats a Date object to ISO 8601 with +07:00 offset", () => {
      // 2026-10-22 07:30:00.500 UTC -> 2026-10-22 14:30:00.500 WIB
      const utcDate = new Date("2026-10-22T07:30:00.500Z");
      const formatted = formatWIBIsoString(utcDate);

      expect(formatted).toBe("2026-10-22T14:30:00.500+07:00");
      expect(new Date(formatted).getTime()).toBe(utcDate.getTime());
    });

    it("handles midnight and day boundary rollover into next day", () => {
      // 2026-10-22 20:00:00 UTC -> 2026-10-23 03:00:00 WIB
      const utcDate = new Date("2026-10-22T20:00:00.000Z");
      const formatted = formatWIBIsoString(utcDate);

      expect(formatted).toBe("2026-10-23T03:00:00.000+07:00");
    });

    it("getNowWIBIsoString returns valid ISO string with +07:00", () => {
      const nowWib = getNowWIBIsoString();
      expect(nowWib).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}\+07:00$/);
      expect(new Date(nowWib).getTime()).toBeCloseTo(Date.now(), -2);
    });

    it("throws RangeError on invalid Date", () => {
      expect(() => formatWIBIsoString(new Date("invalid"))).toThrow(RangeError);
    });
  });

  describe("parseDateTimeInputWIB", () => {
    it("converts HTML datetime-local format into ISO +07:00", () => {
      const input = "2026-10-22T14:30";
      const result = parseDateTimeInputWIB(input);
      expect(result).toBe("2026-10-22T14:30:00.000+07:00");
    });

    it("converts HTML datetime-local with seconds into ISO +07:00", () => {
      const input = "2026-10-22T14:30:45";
      const result = parseDateTimeInputWIB(input);
      expect(result).toBe("2026-10-22T14:30:45.000+07:00");
    });

    it("correctly handles UTC Z string by projecting to +07:00", () => {
      const input = "2026-10-20T08:00:00.000Z";
      const result = parseDateTimeInputWIB(input);
      expect(result).toBe("2026-10-20T15:00:00.000+07:00");
      expect(new Date(result).getTime()).toBe(new Date(input).getTime());
    });

    it("returns empty string for empty input", () => {
      expect(parseDateTimeInputWIB("")).toBe("");
      expect(parseDateTimeInputWIB("   ")).toBe("");
    });
  });

  describe("toWIBInputString", () => {
    it("projects UTC ISO timestamp to YYYY-MM-DDTHH:mm input string", () => {
      // 07:30 UTC -> 14:30 WIB
      const input = "2026-10-22T07:30:00.000Z";
      expect(toWIBInputString(input)).toBe("2026-10-22T14:30");
    });

    it("projects WIB ISO timestamp to identical local input string", () => {
      const input = "2026-10-22T14:30:00.000+07:00";
      expect(toWIBInputString(input)).toBe("2026-10-22T14:30");
    });

    it("handles Date objects correctly", () => {
      const d = new Date("2026-10-22T07:30:00.000Z");
      expect(toWIBInputString(d)).toBe("2026-10-22T14:30");
    });

    it("returns empty string for falsy or invalid input", () => {
      expect(toWIBInputString(null)).toBe("");
      expect(toWIBInputString(undefined)).toBe("");
      expect(toWIBInputString("invalid-date")).toBe("");
    });
  });

  describe("Round-Trip Consistency", () => {
    it("preserves exact input time when converted to ISO and back to input string", () => {
      const originalInput = "2026-10-22T14:30";
      const isoWithOffset = parseDateTimeInputWIB(originalInput);
      const backToInput = toWIBInputString(isoWithOffset);

      expect(backToInput).toBe(originalInput);
    });
  });

  describe("formatWIBDateTime & formatReportTimestamp", () => {
    it("formats dates with Asia/Jakarta timezone", () => {
      const utcIso = "2026-10-22T07:30:00.000Z"; // 14:30 WIB
      const formatted = formatWIBDateTime(utcIso, {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });

      expect(formatted).toBe("14.30");
    });

    it("formatReportTimestamp uses Asia/Jakarta timezone for CSV reports", () => {
      const utcIso = "2026-10-20T08:30:00.000Z"; // 15:30 WIB
      const reportDate = formatReportTimestamp(utcIso);

      expect(reportDate).toContain("15.30");
      expect(reportDate).toContain("2026");
    });
  });
});

