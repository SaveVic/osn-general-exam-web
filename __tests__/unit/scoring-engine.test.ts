import { describe, it, expect } from "vitest";
import {
  roundToTwoDecimals,
  extractSingleChoice,
  extractMultipleChoice,
  extractShortAnswer,
  parseShortAnswerConfig,
  evaluateSingleChoice,
  evaluateMultipleChoice,
  evaluateShortAnswer,
  evaluateQuestionAnswer,
  calculateExamSessionScores,
} from "@/lib/exam/scoring";

describe("Scoring Engine - Unit Tests", () => {
  describe("roundToTwoDecimals & Precision Guard", () => {
    it("membulatkan nilai desimal dengan akurat tanpa floating point drift", () => {
      expect(roundToTwoDecimals(0.1 + 0.2)).toBe(0.3);
      expect(roundToTwoDecimals(33.333333)).toBe(33.33);
      expect(roundToTwoDecimals(14.999999999999998)).toBe(15);
      expect(roundToTwoDecimals(0)).toBe(0);
      expect(roundToTwoDecimals(87.555)).toBe(87.56);
    });
  });

  describe("Ekstraksi Jawaban Siswa & Kunci", () => {
    it("extractSingleChoice mengekstrak string maupun objek { selected }", () => {
      expect(extractSingleChoice("A")).toBe("A");
      expect(extractSingleChoice("  B  ")).toBe("B");
      expect(extractSingleChoice({ selected: "C" })).toBe("C");
      expect(extractSingleChoice({ selected: "  D  " })).toBe("D");
      expect(extractSingleChoice(null)).toBeNull();
      expect(extractSingleChoice("")).toBeNull();
      expect(extractSingleChoice({})).toBeNull();
    });

    it("extractMultipleChoice mengekstrak array string maupun { selected: [] }", () => {
      expect(extractMultipleChoice(["A", "B"])).toEqual(["A", "B"]);
      expect(extractMultipleChoice([" A ", "  "])).toEqual(["A"]);
      expect(extractMultipleChoice({ selected: ["A", "C"] })).toEqual(["A", "C"]);
      expect(extractMultipleChoice(null)).toEqual([]);
      expect(extractMultipleChoice({})).toEqual([]);
    });

    it("extractShortAnswer mengekstrak teks string, angka, maupun { text }", () => {
      expect(extractShortAnswer("Halo")).toBe("Halo");
      expect(extractShortAnswer("  3.14  ")).toBe("3.14");
      expect(extractShortAnswer(42)).toBe("42");
      expect(extractShortAnswer({ text: " Jawaban " })).toBe("Jawaban");
      expect(extractShortAnswer(null)).toBeNull();
      expect(extractShortAnswer("")).toBeNull();
    });

    it("parseShortAnswerConfig membedah konfigurasi toleransi dan case sensitivity", () => {
      expect(parseShortAnswerConfig("42")).toEqual({
        text: "42",
        numeric_tolerance: 0,
        case_sensitive: false,
      });
      expect(
        parseShortAnswerConfig({
          text: "3.14",
          numeric_tolerance: 0.05,
          case_sensitive: true,
        })
      ).toEqual({
        text: "3.14",
        numeric_tolerance: 0.05,
        case_sensitive: true,
      });
      expect(parseShortAnswerConfig(null)).toBeNull();
    });
  });

  describe("Evaluasi Pilihan Ganda Tunggal (single_choice)", () => {
    it("memberikan poin penuh jika opsi yang dipilih sama persis dengan kunci", () => {
      expect(evaluateSingleChoice("A", "A", 10)).toBe(10);
      expect(evaluateSingleChoice({ selected: "B" }, { selected: "B" }, 25)).toBe(25);
      // case-insensitive matching untuk ID opsi
      expect(evaluateSingleChoice("a", "A", 15)).toBe(15);
    });

    it("memberikan skor 0 jika opsi salah atau tidak dijawab", () => {
      expect(evaluateSingleChoice("A", "B", 10)).toBe(0);
      expect(evaluateSingleChoice(null, "B", 10)).toBe(0);
      expect(evaluateSingleChoice("", "B", 10)).toBe(0);
      expect(evaluateSingleChoice("C", null, 10)).toBe(0);
    });
  });

  describe("Evaluasi Pilihan Jamak (multiple_choice)", () => {
    describe("Mode Exact (Default OSN)", () => {
      it("memberikan poin penuh jika himpunan opsi identik tanpa melihat urutan", () => {
        expect(evaluateMultipleChoice(["A", "B"], ["B", "A"], 20)).toBe(20);
        expect(
          evaluateMultipleChoice(
            { selected: ["A", "C", "D"] },
            { selected: ["D", "A", "C"] },
            30
          )
        ).toBe(30);
      });

      it("memberikan skor 0 jika terdapat kelebihan atau kekurangan opsi", () => {
        // Kurang opsi
        expect(evaluateMultipleChoice(["A"], ["A", "B"], 20)).toBe(0);
        // Lebih opsi salah
        expect(evaluateMultipleChoice(["A", "B", "C"], ["A", "B"], 20)).toBe(0);
        // Seluruhnya salah
        expect(evaluateMultipleChoice(["D"], ["A", "B"], 20)).toBe(0);
        // Tidak dijawab
        expect(evaluateMultipleChoice([], ["A", "B"], 20)).toBe(0);
        expect(evaluateMultipleChoice(null, ["A", "B"], 20)).toBe(0);
      });
    });

    describe("Mode Partial (Proporsional Parsial)", () => {
      it("menghitung skor proporsional sesuai rasio benar dikurangi salah", () => {
        // 2 kunci: A, B. Siswa pilih A saja (1/2 = 50%)
        expect(
          evaluateMultipleChoice(["A"], ["A", "B"], 20, { mode: "partial" })
        ).toBe(10);

        // 2 kunci: A, B. Siswa pilih A dan C (1 benar, 1 salah -> net 0)
        expect(
          evaluateMultipleChoice(["A", "C"], ["A", "B"], 20, { mode: "partial" })
        ).toBe(0);

        // 4 kunci: A, B, C, D. Siswa pilih A, B, C (3/4 = 75%)
        expect(
          evaluateMultipleChoice(["A", "B", "C"], ["A", "B", "C", "D"], 20, {
            mode: "partial",
          })
        ).toBe(15);
      });
    });
  });

  describe("Evaluasi Isian Singkat & Isian Numerik (short_answer)", () => {
    it("mengevaluasi jawaban numerik tepat", () => {
      expect(evaluateShortAnswer("42", "42", 10)).toBe(10);
      expect(evaluateShortAnswer(" 100 ", { text: "100" }, 15)).toBe(15);
    });

    it("menangani koma desimal khas Indonesia (koma dan titik)", () => {
      expect(evaluateShortAnswer("3,14", { text: "3.14" }, 20)).toBe(20);
      expect(evaluateShortAnswer("3.14", { text: "3,14" }, 20)).toBe(20);
      expect(evaluateShortAnswer(" 0,005 ", { text: "0.005" }, 20)).toBe(20);
    });

    it("mematuhi rentang batas numeric_tolerance", () => {
      const config = { text: "100", numeric_tolerance: 2 };
      // Dalam rentang [98, 102]
      expect(evaluateShortAnswer("101.5", config, 25)).toBe(25);
      expect(evaluateShortAnswer("98.0", config, 25)).toBe(25);
      expect(evaluateShortAnswer("102", config, 25)).toBe(25);

      // Di luar rentang
      expect(evaluateShortAnswer("102.5", config, 25)).toBe(0);
      expect(evaluateShortAnswer("97.9", config, 25)).toBe(0);
    });

    it("mengevaluasi jawaban teks non-numerik (case-sensitive & case-insensitive)", () => {
      // Case-insensitive (default)
      expect(evaluateShortAnswer("Mitokondria", { text: "mitokondria" }, 10)).toBe(10);
      expect(evaluateShortAnswer("  FOTOSINTESIS  ", { text: "fotosintesis" }, 10)).toBe(10);

      // Case-sensitive
      expect(
        evaluateShortAnswer(
          "DNA",
          { text: "DNA", case_sensitive: true },
          10
        )
      ).toBe(10);
      expect(
        evaluateShortAnswer(
          "dna",
          { text: "DNA", case_sensitive: true },
          10
        )
      ).toBe(0);

      // Jawaban teks salah atau kosong
      expect(evaluateShortAnswer("klorofil", { text: "mitokondria" }, 10)).toBe(0);
      expect(evaluateShortAnswer(null, { text: "mitokondria" }, 10)).toBe(0);
      expect(evaluateShortAnswer("", { text: "mitokondria" }, 10)).toBe(0);
    });
  });

  describe("evaluateQuestionAnswer Router", () => {
    it("mengarahkan ke fungsi evaluasi sesuai question_type", () => {
      expect(evaluateQuestionAnswer("single_choice", "A", "A", 10)).toBe(10);
      expect(evaluateQuestionAnswer("multiple_choice", ["A", "B"], ["A", "B"], 20)).toBe(20);
      expect(evaluateQuestionAnswer("short_answer", "42", "42", 15)).toBe(15);
      expect(evaluateQuestionAnswer("unknown_type", "A", "A", 10)).toBe(0);
      expect(evaluateQuestionAnswer("single_choice", "A", "A", 0)).toBe(0);
    });
  });

  describe("calculateExamSessionScores", () => {
    it("mengalkulasi skor akumulatif sesi ujian secara presisi", () => {
      const questions = [
        {
          id: "q1",
          question_type: "single_choice" as const,
          correct_answer: { selected: "A" },
          points: 33.33,
        },
        {
          id: "q2",
          question_type: "multiple_choice" as const,
          correct_answer: { selected: ["B", "C"] },
          points: 33.33,
        },
        {
          id: "q3",
          question_type: "short_answer" as const,
          correct_answer: { text: "42", numeric_tolerance: 0 },
          points: 33.34,
        },
      ];

      const answers = [
        { question_id: "q1", answer_value: { selected: "A" } }, // Benar -> 33.33
        { question_id: "q2", answer_value: { selected: ["B", "C"] } }, // Benar -> 33.33
        { question_id: "q3", answer_value: { text: "42" } }, // Benar -> 33.34
      ];

      const result = calculateExamSessionScores(questions, answers);

      expect(result.awardedScores["q1"]).toBe(33.33);
      expect(result.awardedScores["q2"]).toBe(33.33);
      expect(result.awardedScores["q3"]).toBe(33.34);
      expect(result.totalScore).toBe(100.0);
    });

    it("memberikan skor 0 pada soal yang tidak ada di daftar jawaban", () => {
      const questions = [
        {
          id: "q1",
          question_type: "single_choice" as const,
          correct_answer: { selected: "A" },
          points: 50,
        },
        {
          id: "q2",
          question_type: "short_answer" as const,
          correct_answer: { text: "10" },
          points: 50,
        },
      ];

      // Siswa hanya menjawab q1
      const answers = [{ question_id: "q1", answer_value: { selected: "A" } }];

      const result = calculateExamSessionScores(questions, answers);

      expect(result.awardedScores["q1"]).toBe(50);
      expect(result.awardedScores["q2"]).toBe(0);
      expect(result.totalScore).toBe(50);
    });
  });
});

