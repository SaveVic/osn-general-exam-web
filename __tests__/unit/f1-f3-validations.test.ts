import { describe, it, expect } from "vitest";
import { examFormSchema } from "@/lib/validations/exam";
import { questionInputSchema } from "@/lib/validations/question";
import { referralCodeSchema } from "@/lib/validations/referral-code";
import { verifyGateCodeSchema } from "@/lib/validations/gate";
import { lobbyIdentitySchema } from "@/lib/validations/lobby";
import { startExamSessionSchema } from "@/lib/validations/session";

describe("F1-02: Skema Validasi Naskah Ujian (examFormSchema)", () => {
  const validPayload = {
    title: "Simulasi OSN Bidang Informatika 2026",
    description: "Petunjuk pengerjaan ujian.",
    duration_minutes: 90,
    starts_at: "2026-10-20T08:00:00.000Z",
    ends_at: "2026-10-20T11:00:00.000Z",
    class_options: ["10-A", "11-IPA-1"],
    is_published: true,
  };

  it("meloloskan data naskah ujian yang sah", () => {
    const res = examFormSchema.safeParse(validPayload);
    expect(res.success).toBe(true);
  });

  it("menolak judul ujian yang kurang dari 3 karakter atau lebih dari 150 karakter", () => {
    expect(examFormSchema.safeParse({ ...validPayload, title: "AB" }).success).toBe(false);
    expect(
      examFormSchema.safeParse({ ...validPayload, title: "A".repeat(151) }).success
    ).toBe(false);
  });

  it("menolak durasi di luar rentang 1..600 menit", () => {
    expect(
      examFormSchema.safeParse({ ...validPayload, duration_minutes: 0 }).success
    ).toBe(false);
    expect(
      examFormSchema.safeParse({ ...validPayload, duration_minutes: 601 }).success
    ).toBe(false);
  });

  it("menolak jadwal ujian apabila ends_at lebih awal atau sama dengan starts_at", () => {
    const res = examFormSchema.safeParse({
      ...validPayload,
      starts_at: "2026-10-20T10:00:00.000Z",
      ends_at: "2026-10-20T09:00:00.000Z",
    });
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.flatten().fieldErrors.ends_at?.[0]).toContain(
        "harus lebih lambat"
      );
    }
  });

  it("menolak jika class_options kosong", () => {
    const res = examFormSchema.safeParse({ ...validPayload, class_options: [] });
    expect(res.success).toBe(false);
  });
});

describe("F1-03: Skema Validasi Butir Soal (questionInputSchema)", () => {
  it("memvalidasi soal Pilihan Ganda (single_choice) dengan kunci jawaban yang sah", () => {
    const res = questionInputSchema.safeParse({
      question_type: "single_choice",
      prompt: "Berapakah hasil dari $2^5$?",
      points: 4,
      options: [
        { id: "A", text: "16" },
        { id: "B", text: "32" },
        { id: "C", text: "64" },
      ],
      correct_answer: { selected: "B" },
    });
    expect(res.success).toBe(true);
  });

  it("menolak single_choice jika jumlah opsi kurang dari 2 atau kunci jawaban tidak termasuk opsi", () => {
    const tooFewOptions = questionInputSchema.safeParse({
      question_type: "single_choice",
      prompt: "Pertanyaan contoh",
      points: 1,
      options: [{ id: "A", text: "Satu-satunya opsi" }],
      correct_answer: { selected: "A" },
    });
    expect(tooFewOptions.success).toBe(false);

    const invalidKey = questionInputSchema.safeParse({
      question_type: "single_choice",
      prompt: "Pertanyaan contoh",
      points: 1,
      options: [
        { id: "A", text: "Opsi A" },
        { id: "B", text: "Opsi B" },
      ],
      correct_answer: { selected: "D" },
    });
    expect(invalidKey.success).toBe(false);
  });

  it("memvalidasi soal Pilihan Jamak (multiple_choice) dan menolak jika kunci di luar opsi", () => {
    const validMulti = questionInputSchema.safeParse({
      question_type: "multiple_choice",
      prompt: "Manakah bilangan prima di bawah ini?",
      points: 5,
      options: [
        { id: "A", text: "2" },
        { id: "B", text: "3" },
        { id: "C", text: "4" },
      ],
      correct_answer: { selected: ["A", "B"] },
    });
    expect(validMulti.success).toBe(true);

    const invalidMulti = questionInputSchema.safeParse({
      question_type: "multiple_choice",
      prompt: "Manakah bilangan prima di bawah ini?",
      points: 5,
      options: [
        { id: "A", text: "2" },
        { id: "B", text: "3" },
      ],
      correct_answer: { selected: ["A", "Z"] },
    });
    expect(invalidMulti.success).toBe(false);
  });

  it("memvalidasi soal Isian Singkat (short_answer) dan menolak teks kunci kosong", () => {
    const validShort = questionInputSchema.safeParse({
      question_type: "short_answer",
      prompt: "Berapa nilai percepatan gravitasi standar (m/s^2)?",
      points: 10,
      options: [],
      correct_answer: { text: "9.8", numeric_tolerance: 0.05, case_sensitive: false },
    });
    expect(validShort.success).toBe(true);

    const invalidShort = questionInputSchema.safeParse({
      question_type: "short_answer",
      prompt: "Pertanyaan isian",
      points: 2,
      options: [],
      correct_answer: { text: "" },
    });
    expect(invalidShort.success).toBe(false);
  });
});

describe("F1-05: Skema Validasi Kode Rujukan Admin (referralCodeSchema)", () => {
  it("meloloskan kode rujukan kuota terbatas maupun tanpa batas", () => {
    expect(
      referralCodeSchema.safeParse({
        code: "OSN26-9XYZ",
        is_unlimited: false,
        max_uses: 50,
        expiration_type: "exam_end",
      }).success
    ).toBe(true);

    expect(
      referralCodeSchema.safeParse({
        code: "UNLIMITED_CODE",
        is_unlimited: true,
        max_uses: null,
        expiration_type: "never",
      }).success
    ).toBe(true);
  });

  it("menolak jika is_unlimited=false tetapi max_uses tidak diisi", () => {
    const res = referralCodeSchema.safeParse({
      code: "OSN26-TEST",
      is_unlimited: false,
      max_uses: null,
      expiration_type: "exam_end",
    });
    expect(res.success).toBe(false);
  });

  it("menolak jika expiration_type='custom' tetapi expires_at kosong atau tidak valid", () => {
    expect(
      referralCodeSchema.safeParse({
        code: "OSN26-CUST",
        is_unlimited: true,
        expiration_type: "custom",
        expires_at: "",
      }).success
    ).toBe(false);
  });
});

describe("F2-01, F2-02, F3-01: Skema Validasi Gerbang, Lobi, & Sesi Siswa", () => {
  it("verifyGateCodeSchema memangkas spasi dan mengubah kode menjadi huruf kapital otomatis", () => {
    const res = verifyGateCodeSchema.safeParse({ code: "  osn26-k7m9  " });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.code).toBe("OSN26-K7M9");
    }
  });

  it("verifyGateCodeSchema menolak karakter ilegal atau spasi di tengah kode", () => {
    expect(verifyGateCodeSchema.safeParse({ code: "OSN 2026!" }).success).toBe(false);
    expect(verifyGateCodeSchema.safeParse({ code: "AB" }).success).toBe(false);
  });

  it("lobbyIdentitySchema memvalidasi nama minimal 3 karakter dan kelas wajib terisi", () => {
    expect(
      lobbyIdentitySchema.safeParse({
        studentName: "Budi Santoso",
        studentClass: "11-IPA-1",
      }).success
    ).toBe(true);

    expect(
      lobbyIdentitySchema.safeParse({
        studentName: "Bu",
        studentClass: "11-IPA-1",
      }).success
    ).toBe(false);

    expect(
      lobbyIdentitySchema.safeParse({
        studentName: "Budi Santoso",
        studentClass: "   ",
      }).success
    ).toBe(false);
  });

  it("startExamSessionSchema menormalisasi referralCode dan memvalidasi identitas", () => {
    const res = startExamSessionSchema.safeParse({
      referralCode: " mat26-x89 ",
      studentName: "Siti Aminah",
      studentClass: "10-A",
    });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.referralCode).toBe("MAT26-X89");
      expect(res.data.studentName).toBe("Siti Aminah");
    }
  });
});

