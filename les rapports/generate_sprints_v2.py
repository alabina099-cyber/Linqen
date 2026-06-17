"""Scrum Roadmap v2 - column layout with functional/tech/devops/sec/quality sections."""
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches

# ── Section colours ───────────────────────────────────────────────────────────
SEC_COLOR = {
    "Functional":   "#2563EB",
    "Technical":    "#7C3AED",
    "DevOps":       "#0369A1",
    "Security":     "#DC2626",
    "Quality":      "#059669",
}
SEC_BG = {
    "Functional":   "#EFF6FF",
    "Technical":    "#F5F3FF",
    "DevOps":       "#F0F9FF",
    "Security":     "#FEF2F2",
    "Quality":      "#F0FDF4",
}

# ── Sprint data ───────────────────────────────────────────────────────────────
SPRINTS = [
    {
        "num": 1,
        "title": "Foundations &\nFirst User Flow",
        "color": "#6366F1",
        "Functional":  ["Overall architecture", "Next.js init + layout", "Auth (login/logout)", "Roles (admin/user)"],
        "Technical":   ["PostgreSQL (Neon)", "DB schema & migrations", "Initial API routes"],
        "DevOps":      ["Docker + compose", "Dev/Staging envs", "CI/CD baseline", "Auto-deployment"],
        "Security":    ["HTTPS + env variables", "HSTS + CSP headers baseline", "Secure .env management"],
        "Quality":     ["Unit tests (Vitest setup)", "Linting & Prettier", "First CI quality gate"],
        "deliverable": "App live online\nwith working auth.",
    },
    {
        "num": 2,
        "title": "Initial CRM\nManagement",
        "color": "#7C3AED",
        "Functional":  ["Prospects CRUD", "Basic Kanban board", "Main dashboard"],
        "Technical":   ["CRM data model", "Secured CRUD APIs", "Relations & indexes"],
        "DevOps":      ["Improved CI/CD", "Env variables", "Basic monitoring"],
        "Security":    ["API rate limiting", "Zod input validation", "XSS protection"],
        "Quality":     ["API tests (Vitest)", "Component tests", "Coverage increase"],
        "deliverable": "Full prospect mgmt\nwith web interface.",
    },
    {
        "num": 3,
        "title": "Sales Pipeline,\nBI & Scoring",
        "color": "#EC4899",
        "Functional":  ["Advanced Kanban (stages)", "Campaigns + follow-ups", "BI / Analytics reports", "Auto prospect scoring"],
        "Technical":   ["Cron / worker jobs", "Aggregations & metrics", "Reporting API"],
        "DevOps":      ["Optimised database", "Scheduled jobs (cron)", "Aggregated logs (Loki)"],
        "Security":    ["Roles (admin/user)", "Controlled API access", "Key actions audit"],
        "Quality":     ["Integration tests", "E2E tests (Playwright)", "Coverage increase"],
        "deliverable": "CRM with pipeline,\ncampaigns & analytics.",
    },
    {
        "num": 4,
        "title": "AI Agent\n(First Version)",
        "color": "#F59E0B",
        "Functional":  ["Conversational agent", "Contextual responses", "Conversation history"],
        "Technical":   ["LangChain + GPT-4o-mini", "Secured AI API", "Prompt management"],
        "DevOps":      ["Secrets Manager", "AI cost monitoring", "AI rate limiting"],
        "Security":    ["Secured API keys", "AI input validation", "AI audit logs"],
        "Quality":     ["AI functional tests", "Regression tests", "Prompt evaluation"],
        "deliverable": "AI agent in CRM\nto assist users.",
    },
    {
        "num": 5,
        "title": "Chrome Extension\n& Integrations",
        "color": "#10B981",
        "Functional":  ["Chrome Ext (MV3)", "LinkedIn prospect capture", "Approval queue", "CRM <-> Ext sync"],
        "Technical":   ["Worker + approval queue", "Integration API", "OAuth / Permissions"],
        "DevOps":      ["Extension deployment", "Separate environments", "Integration monitoring"],
        "Security":    ["OAuth secured", "Minimal permissions", "CSP extension controls"],
        "Quality":     ["E2E integration tests", "Extension tests (MV3)", "Full workflow tests"],
        "deliverable": "LinkedIn import\nto CRM with validation.",
    },
    {
        "num": 6,
        "title": "Automation,\nSecurity & Quality",
        "color": "#EF4444",
        "Functional":  ["Advanced IA automations", "UX/UI optimisations", "Cache & performance", "Scoring improvements"],
        "Technical":   ["Advanced workers", "Cache + perf tuning", "Query optimisations"],
        "DevOps":      ["CI/CD quality gates", "Ephemeral envs", "Advanced observability"],
        "Security":    ["Rate limiting (CORS strict)", "CSP + HSTS headers", "Trivy + Semgrep + Gitleaks", "npm audit"],
        "Quality":     ["Full Playwright suite", "Lighthouse CI (SEO/a11y)", "Coverage > 80%"],
        "deliverable": "Robust & secure\nplatform, prod-ready.",
    },
    {
        "num": 7,
        "title": "Finalization &\nProduction Release",
        "color": "#0EA5E9",
        "Functional":  ["Final fixes & polish", "Tech & user docs", "User onboarding"],
        "Technical":   ["Final optimisations", "Scalability review", "Cleanup & refactor"],
        "DevOps":      ["Production deploy", "Nginx + SSL (HSTS)", "PostgreSQL backups + restore"],
        "Security":    ["Final security audit", "Dependabot (weekly updates)", "Vulnerability report"],
        "Quality":     ["Full acceptance tests", "Regression tests", "Business validation"],
        "deliverable": "Complete product\nin production.",
    },
]

SEC_ORDER = ["Functional", "Technical", "DevOps", "Security", "Quality"]
SEC_LABEL = {"Functional": "FUNCTIONAL", "Technical": "TECHNICAL",
             "DevOps": "DEVOPS & CLOUD", "Security": "SECURITY", "Quality": "QUALITY"}


# ── Drawing helpers ───────────────────────────────────────────────────────────
def rect(ax, x, y, w, h, color, **kw):
    ax.add_patch(mpatches.Rectangle((x, y), w, h, facecolor=color, linewidth=0, **kw))


def rounded_rect(ax, x, y, w, h, color, radius=0.12, edge=None, lw=1, **kw):
    ax.add_patch(mpatches.FancyBboxPatch(
        (x, y), w, h,
        boxstyle=f"round,pad=0,rounding_size={radius}",
        facecolor=color, edgecolor=edge or color, linewidth=lw, **kw))


def draw_section(ax, x, y_top, col_w, sec_name, items, pad=0.15):
    item_h = 0.64
    hdr_h  = 0.50
    body_h = len(items) * item_h + 0.14
    total  = hdr_h + body_h

    # background
    rect(ax, x, y_top - total, col_w, total, SEC_BG[sec_name], zorder=3)
    # thin border
    ax.add_patch(mpatches.Rectangle(
        (x, y_top - total), col_w, total,
        facecolor="none", edgecolor=SEC_COLOR[sec_name], linewidth=0.8, zorder=4))
    # header bar
    rect(ax, x, y_top - hdr_h, col_w, hdr_h, SEC_COLOR[sec_name], zorder=4)
    ax.text(x + pad, y_top - hdr_h / 2, SEC_LABEL[sec_name],
            va="center", ha="left", fontsize=7.8, fontweight="bold",
            color="white", zorder=5)
    # items
    for k, item in enumerate(items):
        iy = y_top - hdr_h - 0.16 - k * item_h
        ax.text(x + pad, iy, "-  " + item,
                va="top", ha="left", fontsize=8.5, color="#1F2937", zorder=5)
    return total


def draw_sprint_column(ax, x, col_w, sprint, top_y, bot_y):
    # ── sprint header ──────────────────────────────────────────────────────
    hdr_h = 1.75
    rounded_rect(ax, x, top_y - hdr_h, col_w, hdr_h,
                 sprint["color"], radius=0.15, zorder=3)
    # pill
    cx, cy = x + col_w / 2, top_y - 0.52
    ax.add_patch(mpatches.Circle(
        (cx, cy), 0.35, facecolor="white",
        edgecolor=sprint["color"], linewidth=2.5, zorder=5))
    ax.text(cx, cy, f"S{sprint['num']}",
            va="center", ha="center", fontsize=11, fontweight="bold",
            color=sprint["color"], zorder=6)
    ax.text(x + col_w / 2, top_y - 1.3, sprint["title"],
            va="center", ha="center", fontsize=9.8, fontweight="bold",
            color="white", zorder=5, multialignment="center")

    # ── sections ──────────────────────────────────────────────────────────
    GAP = 0.10
    cur_y = top_y - hdr_h - GAP
    for sec in SEC_ORDER:
        items = sprint[sec]
        sh = draw_section(ax, x + 0.06, cur_y, col_w - 0.12, sec, items)
        cur_y -= sh + GAP

    # ── deliverable ───────────────────────────────────────────────────────
    deliv_h = cur_y - bot_y
    rounded_rect(ax, x, bot_y, col_w, deliv_h,
                 "#1E293B", radius=0.12, zorder=3)
    ax.text(x + col_w / 2, bot_y + deliv_h - 0.38, "DELIVERABLE",
            va="center", ha="center", fontsize=8.0, fontweight="bold",
            color="#94A3B8", zorder=5, style="italic")
    ax.text(x + col_w / 2, bot_y + deliv_h / 2 - 0.1, sprint["deliverable"],
            va="center", ha="center", fontsize=9.5, fontweight="bold",
            color="white", zorder=5, multialignment="center")


# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    FW, FH = 40, 26
    fig, ax = plt.subplots(figsize=(FW, FH), dpi=120)
    ax.set_xlim(0, FW); ax.set_ylim(0, FH); ax.axis("off")

    # Page background
    rect(ax, 0, 0, FW, FH, "#F1F5F9", zorder=0)

    # ── header ────────────────────────────────────────────────────────────
    HDR_H = 3.0
    rect(ax, 0, FH - HDR_H, FW, HDR_H, "#0F172A", zorder=1)
    ax.text(FW / 2, FH - 1.1, "SCRUM ROADMAP - 7 INCREMENTAL SPRINTS",
            va="center", ha="center", fontsize=29, fontweight="bold",
            color="white", zorder=2)
    ax.text(FW / 2, FH - 1.95,
            "Qlinqen  -  AI-driven LinkedIn B2B Prospecting Agent",
            va="center", ha="center", fontsize=14, color="#94A3B8", zorder=2)
    ax.text(FW / 2, FH - 2.58,
            "Each sprint delivers a potentially shippable increment  |  FUNCTIONAL + TECHNICAL + DEVOPS + SECURITY + QUALITY",
            va="center", ha="center", fontsize=11, color="#64748B",
            style="italic", zorder=2)

    # ── footer ────────────────────────────────────────────────────────────
    FOOT_H = 2.7
    rect(ax, 0, 0, FW, FOOT_H, "#0F172A", zorder=1)

    foot_blocks = [
        ("SCRUM PRINCIPLES",
         ["Shippable increment every sprint",
          "Dev + Sec + Ops + Quality every sprint",
          "Business value visible each iteration",
          "Inspect & adapt continuously"]),
        ("MAIN STACK",
         ["Next.js 16  |  TypeScript  |  TailwindCSS",
          "PostgreSQL (Neon)  |  LangChain",
          "GPT-4o-mini  |  Docker  |  Coolify",
          "GitHub Actions  |  Nginx"]),
        ("SECURITY & CONFORMITY",
         ["Security-by-design from Sprint 1",
          "Zero-Trust principles applied",
          "Secrets management (Gitleaks)",
          "GDPR-compliant data handling"]),
        ("OBSERVABILITY",
         ["Metrics  :  Prometheus",
          "Logs     :  Loki",
          "Dashboards  :  Grafana",
          "Proactive alerting"]),
    ]
    fb_w = FW / len(foot_blocks)
    for j, (title, lines) in enumerate(foot_blocks):
        fx = j * fb_w + 0.6
        ax.text(fx, FOOT_H - 0.38, title,
                va="top", ha="left", fontsize=10.0, fontweight="bold",
                color="#60A5FA", zorder=2)
        for k, ln in enumerate(lines):
            ax.text(fx, FOOT_H - 0.95 - k * 0.44, "> " + ln,
                    va="top", ha="left", fontsize=9.5, color="#CBD5E1", zorder=2)

    # Duration badge bottom-right
    bx, by = FW - 14.5, 0.18
    rounded_rect(ax, bx, by, 14.0, 0.62, "#1E40AF", radius=0.08, zorder=2)
    ax.text(bx + 7.0, by + 0.31,
            "TOTAL DURATION: ~14 weeks  (7 sprints x 2 weeks)",
            va="center", ha="center", fontsize=11.5, fontweight="bold",
            color="white", zorder=3)

    # ── sprint columns ────────────────────────────────────────────────────
    MX, GAP_X = 0.35, 0.22
    col_w = (FW - 2 * MX - 6 * GAP_X) / 7
    SPRINT_TOP = FH - HDR_H - 0.18
    SPRINT_BOT = FOOT_H + 0.18

    for i, sprint in enumerate(SPRINTS):
        cx = MX + i * (col_w + GAP_X)
        draw_sprint_column(ax, cx, col_w, sprint, SPRINT_TOP, SPRINT_BOT)

    plt.savefig("roadmap_7_sprints_v2.png",
                dpi=130, bbox_inches="tight", facecolor="#F1F5F9")
    print("Image generated: roadmap_7_sprints_v2.png")


if __name__ == "__main__":
    main()
