import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Route Handler pemeriksaan kesiapan sistem dan basis data (/api/health).
 * Dirancang ringan, non-cached, dan non-blocking untuk memverifikasi kesiapan operasional
 * serta berfungsi sebagai pemicu keep-alive pencegah auto-pause 7 hari pada Supabase Free Tier.
 */
export async function GET() {
  const startTime = performance.now();
  const timestamp = new Date().toISOString();

  try {
    const supabase = createServiceClient();
    const { error } = await supabase.from("exams").select("id").limit(1);

    const latencyMs = Math.round(performance.now() - startTime);

    if (error) {
      return NextResponse.json(
        {
          status: "degraded",
          timestamp,
          database: {
            status: "disconnected",
            error: "Kueri verifikasi basis data gagal.",
          },
        },
        {
          status: 503,
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate",
          },
        }
      );
    }

    return NextResponse.json(
      {
        status: "ok",
        timestamp,
        database: {
          status: "connected",
          latencyMs,
        },
        uptimeSeconds: Math.round(process.uptime()),
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch {
    return NextResponse.json(
      {
        status: "degraded",
        timestamp,
        database: {
          status: "disconnected",
          error: "Layanan basis data tidak dapat dijangkau.",
        },
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  }
}

