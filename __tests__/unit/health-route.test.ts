import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/health/route";

const mockSelect = vi.fn();
const mockLimit = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createServiceClient: vi.fn(() => ({
    from: mockFrom,
  })),
}));

describe("GET /api/health - Endpoint Kesiapan Sistem & Keep-Alive", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue({
      select: mockSelect.mockReturnValue({
        limit: mockLimit,
      }),
    });
  });

  it("mengembalikan status HTTP 200 dan 'connected' saat basis data sehat", async () => {
    mockLimit.mockResolvedValueOnce({ data: [{ id: "exam-123" }], error: null });

    const response = await GET();
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.status).toBe("ok");
    expect(data.database.status).toBe("connected");
    expect(typeof data.database.latencyMs).toBe("number");
    expect(data.database.latencyMs).toBeGreaterThanOrEqual(0);
    expect(data.timestamp).toBeDefined();
    expect(typeof data.uptimeSeconds).toBe("number");

    // Header Cache-Control wajib menolak caching agar request selalu menyentuh serverless & DB
    const cacheControl = response.headers.get("Cache-Control");
    expect(cacheControl).toContain("no-store");
    expect(cacheControl).toContain("no-cache");
  });

  it("mengembalikan status HTTP 503 dan 'degraded' saat kueri basis data mengalami galat", async () => {
    mockLimit.mockResolvedValueOnce({
      data: null,
      error: { message: "Koneksi PostgreSQL ditolak" },
    });

    const response = await GET();
    expect(response.status).toBe(503);

    const data = await response.json();
    expect(data.status).toBe("degraded");
    expect(data.database.status).toBe("disconnected");
    expect(data.database.error).toBeDefined();
    expect(data.timestamp).toBeDefined();

    const cacheControl = response.headers.get("Cache-Control");
    expect(cacheControl).toContain("no-store");
  });

  it("mengembalikan status HTTP 503 dan menangani exception tak terduga dengan aman", async () => {
    mockLimit.mockRejectedValueOnce(new Error("Network timeout fatal"));

    const response = await GET();
    expect(response.status).toBe(503);

    const data = await response.json();
    expect(data.status).toBe("degraded");
    expect(data.database.status).toBe("disconnected");
    expect(data.database.error).toBe("Layanan basis data tidak dapat dijangkau.");
  });

  it("tidak membocorkan variabel lingkungan rahasia atau token otentikasi", async () => {
    mockLimit.mockResolvedValueOnce({ data: [], error: null });

    const response = await GET();
    const textPayload = await response.text();

    expect(textPayload).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(textPayload).not.toContain("NEXT_PUBLIC_SUPABASE_ANON_KEY");
    expect(textPayload).not.toContain("mock-service-role-key");
  });
});

