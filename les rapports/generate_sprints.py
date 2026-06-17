"""Génère une image PNG démonstrative des 7 sprints du projet Qlinqen."""
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch
import matplotlib.path as mpath

# 7 incremental Scrum sprints: each sprint delivers a potentially
# shippable increment combining Dev + Sec + Ops + Tests
SPRINTS = [
    {
        "num": 1,
        "title": "Foundations & First User Flow",
        "duration": "2 weeks",
        "color": "#6366F1",
        "goal": "Deployed app with working authentication",
        "tasks": [
            "Overall architecture & Next.js + PostgreSQL bootstrap",
            "Authentication (login/logout) + admin/user roles",
            "Docker containerization + Dev/Staging environments",
            "Baseline CI/CD (lint, typecheck, build) + initial tests",
            "Automated deployment of the first online version",
        ],
    },
    {
        "num": 2,
        "title": "Initial CRM Management",
        "duration": "2 weeks",
        "color": "#8B5CF6",
        "goal": "Full prospect management through the web UI",
        "tasks": [
            "CRM data model + prospects CRUD",
            "First analytics dashboard and initial Kanban view",
            "API security hardening (Zod input validation)",
            "Unit tests on backend & frontend (Vitest)",
            "CI/CD pipeline upgrade + application monitoring",
        ],
    },
    {
        "num": 3,
        "title": "Sales Pipeline & User Experience",
        "duration": "2 weeks",
        "color": "#EC4899",
        "goal": "CRM usable by a real sales team",
        "tasks": [
            "Advanced Kanban + prospect search and filters",
            "Prospecting Campaigns module with automated follow-ups",
            "Automatic prospect scoring + BI / reporting module",
            "Application logging + integration tests",
            "UX/UI polish (light/dark mode, responsive design)",
        ],
    },
    {
        "num": 4,
        "title": "First Version of the AI Agent",
        "duration": "2 weeks",
        "color": "#F59E0B",
        "goal": "AI agent able to assist the user inside the CRM",
        "tasks": [
            "LangChain + GPT-4o-mini integration in the backend",
            "Conversational chat module + history persistence",
            "Securing AI calls and prompt management",
            "AI cost monitoring + functional tests of the agent",
            "Deployment of the AI feature to staging then production",
        ],
    },
    {
        "num": 5,
        "title": "Chrome Extension & Integrations",
        "duration": "2 weeks",
        "color": "#10B981",
        "goal": "Import and drive LinkedIn prospects from the CRM",
        "tasks": [
            "Chrome Extension (Manifest V3) + prospect capture",
            "TypeScript worker + actions approval queue",
            "CRM <-> Extension sync via a secured API",
            "Hardening permissions and the extension bridge",
            "End-to-end tests (Playwright) + progressive rollout",
        ],
    },
    {
        "num": 6,
        "title": "Automation, Security & Quality",
        "duration": "2 weeks",
        "color": "#EF4444",
        "goal": "Robust, secure and high-performance platform",
        "tasks": [
            "Advanced AI automations + rate limiting (API & LinkedIn)",
            "Anti-XSS (Zod) + strict CORS + CSP/HSTS headers",
            "Security audit: Trivy, Semgrep, Gitleaks, npm audit",
            "Stronger test coverage (28 unit tests + E2E suite)",
            "Advanced observability: Prometheus / Grafana / Loki",
        ],
    },
    {
        "num": 7,
        "title": "Finalization & Production Release",
        "duration": "2 weeks",
        "color": "#0EA5E9",
        "goal": "Complete product ready for real-world operation",
        "tasks": [
            "Final fixes + UX and performance optimizations",
            "Technical & user documentation (README, diagrams)",
            "Infra scalability: Nginx + Coolify + Trivy on each deploy",
            "Daily PostgreSQL backups + automated restore test",
            "Final acceptance + business validation + go-live",
        ],
    },
]


def draw_sprint_card(ax, x, y, w, h, sprint):
    """Dessine une carte de sprint stylisée."""
    # Ombre
    shadow = FancyBboxPatch(
        (x + 0.08, y - 0.08), w, h,
        boxstyle="round,pad=0.02,rounding_size=0.15",
        linewidth=0, facecolor="#000000", alpha=0.12, zorder=1,
    )
    ax.add_patch(shadow)

    # Carte principale
    card = FancyBboxPatch(
        (x, y), w, h,
        boxstyle="round,pad=0.02,rounding_size=0.15",
        linewidth=2, edgecolor=sprint["color"],
        facecolor="white", zorder=2,
    )
    ax.add_patch(card)

    # Bandeau d'en-tête coloré (un peu plus haut pour accueillir l'objectif)
    header_h = 1.25
    header = FancyBboxPatch(
        (x, y + h - header_h), w, header_h,
        boxstyle="round,pad=0.02,rounding_size=0.15",
        linewidth=0, facecolor=sprint["color"], zorder=3,
    )
    ax.add_patch(header)
    # Masquer le bas arrondi du header
    rect = mpatches.Rectangle(
        (x, y + h - header_h), w, header_h * 0.55,
        linewidth=0, facecolor=sprint["color"], zorder=3,
    )
    ax.add_patch(rect)

    # Numéro de sprint dans pastille
    circle_x = x + 0.5
    circle_y = y + h - 0.5
    pastille = mpatches.Circle(
        (circle_x, circle_y), 0.3,
        facecolor="white", edgecolor=sprint["color"],
        linewidth=2.5, zorder=4,
    )
    ax.add_patch(pastille)
    ax.text(
        circle_x, circle_y, f"S{sprint['num']}",
        ha="center", va="center",
        fontsize=10.5, fontweight="bold",
        color=sprint["color"], zorder=5,
    )

    # Titre du sprint
    ax.text(
        x + 0.95, y + h - 0.4, sprint["title"],
        ha="left", va="center",
        fontsize=10.5, fontweight="bold",
        color="white", zorder=5,
    )
    # Durée
    ax.text(
        x + 0.95, y + h - 0.7, sprint['duration'],
        ha="left", va="center",
        fontsize=8.0, color="white", alpha=0.95, zorder=5,
    )

    # Goal / deliverable (key in Scrum)
    ax.text(
        x + 0.25, y + h - 1.05, "GOAL",
        ha="left", va="center",
        fontsize=7.8, fontweight="bold",
        color="white", alpha=0.85, zorder=5,
    )
    ax.text(
        x + 1.0, y + h - 1.05, sprint["goal"],
        ha="left", va="center",
        fontsize=7.8, color="white",
        fontstyle="italic", zorder=5,
    )

    # Liste des tâches
    task_y = y + h - header_h - 0.3
    for task in sprint["tasks"]:
        ax.text(
            x + 0.25, task_y, "▸",
            ha="left", va="top",
            fontsize=10, color=sprint["color"],
            fontweight="bold", zorder=5,
        )
        ax.text(
            x + 0.55, task_y, task,
            ha="left", va="top",
            fontsize=8.3, color="#1F2937",
            wrap=True, zorder=5,
        )
        task_y -= 0.58


def main():
    fig, ax = plt.subplots(figsize=(22, 13.5), dpi=160)
    ax.set_xlim(0, 22)
    ax.set_ylim(0, 13.5)
    ax.axis("off")

    # Fond dégradé léger
    bg = mpatches.Rectangle(
        (0, 0), 22, 13.5,
        facecolor="#F8FAFC", zorder=0,
    )
    ax.add_patch(bg)

    # Titre principal
    ax.text(
        11, 12.9, "Qlinqen - Scrum Roadmap across 7 Incremental Sprints",
        ha="center", va="center",
        fontsize=21, fontweight="bold", color="#0F172A",
    )
    ax.text(
        11, 12.35,
        "AI-driven LinkedIn B2B Prospecting Agent  -  Each sprint delivers a potentially shippable increment (Dev + Sec + Ops + Tests)",
        ha="center", va="center",
        fontsize=10.5, color="#475569", style="italic",
    )

    # Ligne du temps horizontale décorative
    timeline_y = 11.5
    ax.plot(
        [1.0, 21.0], [timeline_y, timeline_y],
        color="#CBD5E1", linewidth=2, linestyle="--", zorder=1,
    )

    # Disposition : 2 lignes × 4 colonnes (dernière case = légende)
    card_w = 5.05
    card_h = 4.6
    margin_x = 0.3
    start_x = 0.45

    positions = [
        (0, 0), (1, 0), (2, 0), (3, 0),
        (0, 1), (1, 1), (2, 1),
    ]
    row_y = [6.1, 0.9]  # haut et bas

    for i, sprint in enumerate(SPRINTS):
        col, row = positions[i]
        x = start_x + col * (card_w + margin_x)
        y = row_y[row]
        draw_sprint_card(ax, x, y, card_w, card_h, sprint)

        # Petit point sur la timeline (uniquement pour la rangée du haut)
        if row == 0:
            dot_x = x + card_w / 2
            ax.plot(
                [dot_x], [timeline_y], marker="o",
                markersize=14, color=sprint["color"],
                markeredgecolor="white", markeredgewidth=2, zorder=4,
            )
            ax.plot(
                [dot_x, dot_x], [timeline_y - 0.05, y + card_h],
                color=sprint["color"], linewidth=1.2,
                linestyle=":", alpha=0.5, zorder=2,
            )

    # Carte synthèse en bas-droite (dernière case vide)
    sx = start_x + 3 * (card_w + margin_x)
    sy = row_y[1]
    box = FancyBboxPatch(
        (sx, sy), card_w, card_h,
        boxstyle="round,pad=0.02,rounding_size=0.15",
        linewidth=2, edgecolor="#0F172A",
        facecolor="#0F172A", zorder=2,
    )
    ax.add_patch(box)
    ax.text(
        sx + card_w / 2, sy + card_h - 0.5,
        "Project Scrum Summary",
        ha="center", va="center",
        fontsize=13, fontweight="bold", color="white",
    )
    bilan = [
        ("Total duration", "14 weeks (7 x 2 weeks)"),
        ("Ceremonies", "Planning - Daily - Review - Retro"),
        ("Delivery", "Increment shipped every sprint"),
        ("Modules", "Frontend - Worker - Extension"),
        ("AI", "LangChain + GPT-4o-mini"),
        ("CI/CD", "7 GitHub Actions workflows"),
        ("Tests", "28 Vitest + E2E Playwright"),
        ("Security", "Trivy - Semgrep - Gitleaks"),
    ]
    by = sy + card_h - 1.05
    for label, value in bilan:
        ax.text(sx + 0.25, by, label,
                ha="left", va="top", fontsize=8.5,
                color="#94A3B8")
        ax.text(sx + card_w - 0.25, by, value,
                ha="right", va="top", fontsize=8.5,
                color="white", fontweight="bold")
        by -= 0.38

    # Pied de page
    ax.text(
        11, 0.4,
        "Scrum methodology  -  2-week sprints  -  Daily standups  -  Sprint Review and Retrospective at the end of every sprint",
        ha="center", va="center",
        fontsize=9.5, color="#64748B", style="italic",
    )

    plt.savefig(
        "roadmap_7_sprints.png",
        dpi=180, bbox_inches="tight",
        facecolor="#F8FAFC",
    )
    print("Image generated: roadmap_7_sprints.png")


if __name__ == "__main__":
    main()
