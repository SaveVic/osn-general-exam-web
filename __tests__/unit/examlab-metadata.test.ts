import { describe, expect, it } from "vitest";
import { metadata as rootMetadata, viewport as rootViewport } from "@/app/layout";
import { metadata as homeMetadata } from "@/app/page";
import { metadata as adminLoginMetadata } from "@/app/admin/masuk/page";
import { metadata as adminDashboardMetadata } from "@/app/admin/dasbor/page";
import { metadata as newExamMetadata } from "@/app/admin/ujian/baru/page";
import { metadata as questionBankMetadata } from "@/app/admin/ujian/[id]/soal/page";
import { metadata as referralCodeMetadata } from "@/app/admin/ujian/[id]/kode-rujukan/page";
import { metadata as monitoringMetadata } from "@/app/admin/ujian/[id]/pemantauan/page";
import { metadata as reportMetadata } from "@/app/admin/ujian/[id]/laporan/page";
import { metadata as settingsMetadata } from "@/app/admin/ujian/[id]/pengaturan/page";
import { metadata as examSessionMetadata } from "@/app/ujian/[sessionId]/page";
import { metadata as examFinishedMetadata } from "@/app/ujian/selesai/page";
import robots from "@/app/robots";
import manifest from "@/app/manifest";
import sitemap from "@/app/sitemap";

describe("ExamLab Root Metadata & SEO Architecture", () => {
  it("defines standard root title template and metadataBase for examlab.tech", () => {
    expect(rootMetadata.title).toEqual({
      default: "ExamLab — Platform Ujian Teknis & Olimpiade Sains",
      template: "%s | ExamLab",
    });

    expect(rootMetadata.metadataBase?.toString()).toBe("https://examlab.tech/");
    expect(rootMetadata.applicationName).toBe("ExamLab");
    expect(rootMetadata.alternates?.canonical).toBe("https://examlab.tech");
  });

  it("configures OpenGraph and Twitter cards for ExamLab branding", () => {
    expect(rootMetadata.openGraph?.title).toBe(
      "ExamLab — Platform Ujian Teknis & Olimpiade Sains"
    );
    expect(rootMetadata.openGraph?.siteName).toBe("ExamLab");
    expect(rootMetadata.openGraph?.url).toBe("https://examlab.tech");

    expect(rootMetadata.twitter).toMatchObject({
      card: "summary_large_image",
      creator: "@examlab",
    });
  });

  it("configures theme colors in viewport export", () => {
    expect(rootViewport.themeColor).toEqual([
      { media: "(prefers-color-scheme: light)", color: "#4f46e5" },
      { media: "(prefers-color-scheme: dark)", color: "#020617" },
    ]);
    expect(rootViewport.width).toBe("device-width");
    expect(rootViewport.initialScale).toBe(1);
  });

  it("serves robots.txt disallowing admin and exam sessions", () => {
    const rules = robots();
    const ruleObj = Array.isArray(rules.rules) ? rules.rules[0] : rules.rules;

    expect(ruleObj.userAgent).toBe("*");
    expect(ruleObj.allow).toBe("/");
    expect(ruleObj.disallow).toContain("/admin/");
    expect(ruleObj.disallow).toContain("/ujian/");
    expect(ruleObj.disallow).toContain("/api/");
    expect(rules.sitemap).toBe("https://examlab.tech/sitemap.xml");
  });

  it("serves web app manifest with standalone display and brand colors", () => {
    const pwaManifest = manifest();
    expect(pwaManifest.name).toBe("ExamLab — Platform Ujian Teknis & Olimpiade Sains");
    expect(pwaManifest.short_name).toBe("ExamLab");
    expect(pwaManifest.display).toBe("standalone");
    expect(pwaManifest.background_color).toBe("#020617");
    expect(pwaManifest.theme_color).toBe("#4f46e5");
    expect(pwaManifest.icons?.[0]?.src).toBe("/favicon.ico");
  });

  it("generates sitemap pointing to canonical domain", () => {
    const entries = sitemap();
    expect(entries).toHaveLength(1);
    expect(entries[0].url).toBe("https://examlab.tech");
    expect(entries[0].priority).toBe(1.0);
  });
});

describe("Page Specific Titles & Robots Directives", () => {
  it("preserves exact title strings for existing test contracts", () => {
    expect(homeMetadata.title).toBe("Portal Ujian");
    expect(adminLoginMetadata.title).toBe("Portal Admin");
    expect(adminDashboardMetadata.title).toBe("Dashboard");
  });

  it("enforces noindex and nofollow on protected admin pages", () => {
    const adminPages = [
      adminLoginMetadata,
      adminDashboardMetadata,
      newExamMetadata,
      questionBankMetadata,
      referralCodeMetadata,
      monitoringMetadata,
      reportMetadata,
      settingsMetadata,
    ];

    for (const meta of adminPages) {
      expect(meta.robots).toEqual({
        index: false,
        follow: false,
      });
    }
  });

  it("enforces noindex and nofollow on student exam session routes", () => {
    expect(examSessionMetadata.title).toBe("Ruang Ujian");
    expect(examSessionMetadata.robots).toEqual({
      index: false,
      follow: false,
    });

    expect(examFinishedMetadata.title).toBe("Ujian Selesai");
    expect(examFinishedMetadata.robots).toEqual({
      index: false,
      follow: false,
    });
  });
});

