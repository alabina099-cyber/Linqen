"""Scrum Roadmap v3 - exact column layout with icons, matching reference, in English."""
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches

SEC_META = {
    "Functional": {"icon": "*", "color": "#2563EB"},
    "Technical":  {"icon": "#", "color": "#7C3AED"},
    "DevOps":     {"icon": "@", "color": "#0369A1"},
    "Security":   {"icon": "!", "color": "#DC2626"},
    "Quality":    {"icon": "+", "color": "#059669"},
}

SPRINTS = [
    {
        "num": 1, "title": "Foundations &\nFirst User Flow", "color": "#2563EB",
        "Functional": ["Overall architecture", "Next.js init (login/logout)", "Auth (login/logout)", "Roles (admin/user)"],
        "Technical":  ["PostgreSQL (Neon)", "DB schema & migrations", "Initial API routes"],
        "DevOps":     ["Docker + docker-compose", "Environments (Dev/Staging)", "CI/CD GitHub Actions", "Automatic deployment"],
        "Security":   ["HTTPS (Let's Encrypt)", "Environment variables", "DB HSTS"],
        "Quality":    ["Unit tests (Vitest)", "Project organisation", "Linting & Prettier"],
        "deliverable": "App deployed online with functional authentication.",
    },
    {
        "num": 2, "title": "Initial CRM\nManagement", "color": "#7C3AED",
        "Functional": ["Prospects module (CRUD)", "Basic Kanban", "Main dashboard"],
        "Technical":  ["CRM data model", "Secured CRUD APIs", "Relations & indexes"],
        "DevOps":     ["Improved CI/CD", "Env variables", "Basic monitoring"],
        "Security":   ["API rate limiting", "Zod validation", "XSS protection"],
        "Quality":    ["API tests (Vitest)", "Component tests", "Coverage increase"],
        "deliverable": "Complete prospect management with web interface.",
    },
    {
        "num": 3, "title": "Sales Pipeline,\nBI & Scoring", "color": "#059669",
        "Functional": ["Advanced Kanban (stages)", "Campaigns (auto follow-ups)", "BI / Analytics reports", "Auto prospect scoring"],
        "Technical":  ["Scheduled jobs (cron/worker)", "Aggregations & metrics", "API reporting"],
        "DevOps":     ["Optimised database", "Scheduled jobs (cron)", "Aggregated logs (Loki)"],
        "Security":   ["Roles (admin/user)", "Controlled API access", "Key actions audit"],
        "Quality":    ["Integration tests", "E2E tests (Playwright)", "Code review"],
        "deliverable": "CRM with pipeline, campaigns and analytical dashboards.",
    },
    {
        "num": 4, "title": "AI Agent\n(First Version)", "color": "#D97706",
        "Functional": ["Conversational agent (AgentChat)", "Contextual responses", "Conversation history"],
        "Technical":  ["LangChain", "GPT-4o-mini", "Secured AI API", "Context management"],
        "DevOps":     ["Secrets management", "AI cost monitoring", "AI rate limiting"],
        "Security":   ["Secured API keys", "AI input validation", "AI audit logs"],
        "Quality":    ["AI functional tests", "Non-regression tests", "Prompt evaluation"],
        "deliverable": "AI agent integrated into CRM to assist users.",
    },
    {
        "num": 5, "title": "Chrome Extension\n& Integrations", "color": "#EA580C",
        "Functional": ["Chrome Ext (MV3)", "LinkedIn prospect capture", "Approval queue", "CRM ↔ Extension sync"],
        "Technical":  ["Worker (approval queue)", "Integration API", "OAuth / Permissions"],
        "DevOps":     ["Extension deployment", "Separate environments", "Integration monitoring"],
        "Security":   ["Secured OAuth", "Minimal permissions", "Extension CSP controls"],
        "Quality":    ["E2E integration tests", "Extension tests (MV3)", "Complete workflow tests"],
        "deliverable": "LinkedIn prospects import to CRM with validation.",
    },
    {
        "num": 6, "title": "Automation,\nSecurity & Quality", "color": "#DC2626",
        "Functional": ["Advanced AI automations", "UX/UI optimisations", "Cache & performance", "Scoring improvements"],
        "Technical":  ["Advanced workers", "Cache + perf tuning", "Query optimisations"],
        "DevOps":     ["CI/CD quality gates", "Ephemeral environments", "Advanced observability"],
        "Security":   ["Reinforced rate limiting", "Strict CORS (whitelist)", "CSP & HSTS headers", "Automated security: Trivy, Semgrep, Gitleaks"],
        "Quality":    ["Integration tests", "Extension tests (MV3)", "Complete workflow tests", "Full Playwright E2E suite"],
        "deliverable": "Robust, secure and high-performance platform.",
    },
    {
        "num": 7, "title": "Finalization &\nProduction Release", "color": "#4F46E5",
        "Functional": ["Corrections & polish", "Documentation (tech & user)", "User onboarding"],
        "Technical":  ["Final optimisations", "Scalability review", "Cleanup & refactor"],
        "DevOps":     ["Production deployment", "Nginx + SSL (HSTS)", "Scale & resources"],
        "Security":   ["Final audit", "Final hardening", "Dependabot (weekly updates)"],
        "Quality":    ["Complete acceptance", "Regression tests", "Business validation"],
        "deliverable": "Complete product in production, stable, secure and monitored.",
    },
]

SEC_ORDER = ["Functional", "Technical", "DevOps", "Security", "Quality"]


def draw_sprint_col(ax, x, col_w, sprint, top_y, bot_y):
    hdr_h = 1.4
    r = mpatches.FancyBboxPatch(
        (x, top_y - hdr_h), col_w, hdr_h,
        boxstyle="round,pad=0,rounding_size=0.25",
        facecolor=sprint["color"], edgecolor=sprint["color"], linewidth=1, zorder=3)
    ax.add_patch(r)
    ax.add_patch(mpatches.Rectangle(
        (x, top_y - hdr_h), col_w, hdr_h * 0.45,
        facecolor=sprint["color"], linewidth=0, zorder=3))

    cx = x + 0.42
    cy = top_y - 0.42
    ax.add_patch(mpatches.Circle(
        (cx, cy), 0.28, facecolor="white", edgecolor=sprint["color"],
        linewidth=2, zorder=5))
    ax.text(cx, cy, str(sprint["num"]), ha="center", va="center",
            fontsize=10, fontweight="bold", color=sprint["color"], zorder=6)

    ax.text(x + col_w / 2 + 0.15, top_y - 0.72, sprint["title"],
            ha="center", va="center", fontsize=9.5, fontweight="bold",
            color="white", zorder=5, multialignment="center")

    cur_y = top_y - hdr_h - 0.08
    GAP = 0.06
    for sec in SEC_ORDER:
        items = sprint[sec]
        meta = SEC_META[sec]
        item_h = 0.40
        pad_top = 0.22
        pad_bot = 0.12
        sec_h = pad_top + len(items) * item_h + pad_bot

        ax.add_patch(mpatches.Rectangle(
            (x + 0.04, cur_y - sec_h), col_w - 0.08, sec_h,
            facecolor="#F8FAFC", edgecolor="#E2E8F0", linewidth=0.6, zorder=2))

        ax.text(x + 0.18, cur_y - 0.10, meta["icon"],
                ha="left", va="top", fontsize=10, zorder=5)
        ax.text(x + 0.52, cur_y - 0.10, sec.upper(),
                ha="left", va="top", fontsize=7.5, fontweight="bold",
                color=meta["color"], zorder=5)

        for k, item in enumerate(items):
            iy = cur_y - 0.38 - k * item_h
            ax.text(x + 0.22, iy, "✓", ha="left", va="top",
                    fontsize=8, color=meta["color"], fontweight="bold", zorder=5)
            ax.text(x + 0.44, iy, item, ha="left", va="top",
                    fontsize=8, color="#334155", zorder=5)

        cur_y -= sec_h + GAP

    # DELIVERABLE
    deliv_h = cur_y - bot_y
    ax.add_patch(mpatches.Rectangle(
        (x + 0.04, bot_y), col_w - 0.08, deliv_h,
        facecolor="#F1F5F9", edgecolor=sprint["color"],
        linewidth=1.2, linestyle="--", zorder=2))

    ax.text(x + col_w / 2, bot_y + deliv_h - 0.28, ">>  DELIVERABLE",
            ha="center", va="center", fontsize=7.5, fontweight="bold",
            color="#64748B", zorder=5)
    ax.text(x + col_w / 2, bot_y + deliv_h / 2 - 0.05, sprint["deliverable"],
            ha="center", va="center", fontsize=8.2, fontweight="bold",
            color=sprint["color"], zorder=5, multialignment="center",
            style="italic")


def main():
    FW, FH = 28, 19
    fig, ax = plt.subplots(figsize=(FW, FH), dpi=140)
    ax.set_xlim(0, FW)
    ax.set_ylim(0, FH)
    ax.axis("off")
    fig.patch.set_facecolor("white")

    # Title
    ax.text(FW / 2, FH - 0.7, "SCRUM ROADMAP - 7 INCREMENTAL SPRINTS",
            ha="center", va="center", fontsize=22, fontweight="bold", color="#0F172A")
    ax.text(FW / 2, FH - 1.35,
            "Qlinqen - AI-driven LinkedIn B2B Prospecting Agent  |  Each sprint delivers a shippable increment (Dev + Sec + Ops + Quality)",
            ha="center", va="center", fontsize=10, color="#64748B", style="italic")

    # Columns
    MX, GAP_X = 0.25, 0.15
    col_w = (FW - 2 * MX - 6 * GAP_X) / 7
    TOP = FH - 1.9
    BOT = 0.6

    for i, sprint in enumerate(SPRINTS):
        cx = MX + i * (col_w + GAP_X)
        draw_sprint_col(ax, cx, col_w, sprint, TOP, BOT)
        if i < 6:
            ax.plot([cx + col_w + GAP_X / 2, cx + col_w + GAP_X / 2], [BOT, TOP],
                    color="#E2E8F0", linewidth=0.8, linestyle="-", zorder=1)

    plt.savefig("roadmap_7_sprints_v3.png", dpi=150, bbox_inches="tight", facecolor="white")
    print("Image generated: roadmap_7_sprints_v3.png")


if __name__ == "__main__":
    main()
