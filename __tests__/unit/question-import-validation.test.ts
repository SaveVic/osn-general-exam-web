import { describe, it, expect } from "vitest";
import {
  EXAMPLE_IMPORT_QUESTIONS,
  MAX_IMPORT_QUESTIONS,
  parseAndValidateQuestionsJson,
} from "@/lib/validations/question";

describe("Validasi Import JSON Soal (lib/validations/question.ts)", () => {
  it("memvalidasi array JSON bawaan EXAMPLE_IMPORT_QUESTIONS (single_choice, multiple_choice, short_answer)", () => {
    const result = parseAndValidateQuestionsJson(EXAMPLE_IMPORT_QUESTIONS);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(3);
      expect(result.data[0].question_type).toBe("single_choice");
      expect(result.data[1].question_type).toBe("multiple_choice");
      expect(result.data[2].question_type).toBe("short_answer");
      expect(result.data[2].options).toEqual([]);
    }
  });

  it("mendukung wrapper objek { questions: [...] } dan mengabaikan order_index dari file JSON", () => {
    const payload = {
      questions: [
        {
          order_index: 999,
          question_type: "short_answer",
          prompt: "Berapa hasil 6 * 7?",
          points: 4,
          correct_answer: { text: "42" },
        },
      ],
    };

    const result = parseAndValidateQuestionsJson(payload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).not.toHaveProperty("order_index");
      expect(result.data[0].options).toEqual([]);
      expect(result.data[0].correct_answer).toEqual({
        text: "42",
        numeric_tolerance: 0,
        case_sensitive: false,
      });
    }
  });

  it("menolak struktur root selain array atau wrapper questions dan array kosong", () => {
    const singleObj = parseAndValidateQuestionsJson({ question_type: "short_answer" });
    expect(singleObj.success).toBe(false);
    if (!singleObj.success) {
      expect(singleObj.errors[0]).toContain("Struktur root JSON tidak valid");
    }

    const emptyArr = parseAndValidateQuestionsJson([]);
    expect(emptyArr.success).toBe(false);
    if (!emptyArr.success) {
      expect(emptyArr.errors[0]).toContain("minimal 1 butir soal");
    }
  });

  it("menolak batch yang melebihi batas maksimal 200 soal", () => {
    const oversized = Array.from({ length: MAX_IMPORT_QUESTIONS + 1 }, (_, i) => ({
      question_type: "short_answer",
      prompt: `Soal ke-${i + 1}`,
      correct_answer: { text: "1" },
    }));

    const result = parseAndValidateQuestionsJson(oversized);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors[0]).toContain(`maksimal ${MAX_IMPORT_QUESTIONS} soal`);
    }
  });

  it("melaporkan nomor soal spesifik untuk opsi duplikat, > 10 opsi, atau kunci tidak cocok", () => {
    const invalidPayload = [
      {
        question_type: "single_choice",
        prompt: "Soal #1 valid sepenuhnya",
        options: [
          { id: "A", text: "Satu" },
          { id: "B", text: "Dua" },
        ],
        correct_answer: { selected: "A" },
      },
      {
        question_type: "single_choice",
        prompt: "Soal #2 opsi duplikat",
        options: [
          { id: "A", text: "Satu" },
          { id: "A", text: "Duplikat" },
        ],
        correct_answer: { selected: "A" },
      },
      {
        question_type: "multiple_choice",
        prompt: "Soal #3 kunci tidak ada di opsi",
        options: [
          { id: "A", text: "Ya" },
          { id: "B", text: "Tidak" },
        ],
        correct_answer: { selected: ["A", "Z"] },
      },
    ];

    const result = parseAndValidateQuestionsJson(invalidPayload);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.some((e) => e.startsWith("Soal #2:") && e.includes("duplikat"))).toBe(true);
      expect(result.errors.some((e) => e.startsWith("Soal #3:") && e.includes("harus merupakan opsi"))).toBe(true);
    }
  });
});
