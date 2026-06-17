"""Generate backlog_table.html from PRODUCT_BACKLOG.md in a clean light theme."""
import re

HTML_HEAD = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Qlinqen — Product Backlog (7 Sprints)</title>
<style>
  :root{--bg:#F8FAFC;--card:#FFFFFF;--border:#E2E8F0;--text:#0F172A;--muted:#64748B;--accent:#2563EB;--must:#DC2626;--should:#D97706;--done:#059669;}
  *{box-sizing:border-box}
  body{margin:0;font-family:system-ui,-apple-system,sans-serif;background:var(--bg);color:var(--text)}
  header{text-align:center;padding:1.5rem 1rem;border-bottom:1px solid var(--border);background:#fff}
  h1{margin:0;font-size:1.7rem}
  .subtitle{color:var(--muted);font-size:.9rem;margin-top:.3rem}
  .meta{display:flex;justify-content:center;gap:1.5rem;margin-top:.8rem;flex-wrap:wrap;font-size:.85rem;color:var(--muted)}
  .meta b{color:var(--accent)}
  .filters{display:flex;justify-content:center;gap:.4rem;padding:.8rem;flex-wrap:wrap;background:#fff}
  .filters button{background:#fff;color:var(--text);border:1px solid var(--border);border-radius:6px;padding:.35rem .8rem;cursor:pointer;font-size:.8rem}
  .filters button:hover,.filters button.active{background:var(--accent);border-color:var(--accent);color:#fff}
  .container{max-width:1400px;margin:0 auto;padding:0 1rem 2rem}
  .sprint{margin-bottom:1.2rem;border:1px solid var(--border);border-radius:10px;overflow:hidden;background:var(--card);box-shadow:0 1px 3px #0000000d}
  .sprint-hdr{display:flex;align-items:center;gap:.8rem;padding:.7rem 1rem;font-weight:700;cursor:pointer;background:var(--card)}
  .pill{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:.8rem;font-weight:800;color:#fff;flex-shrink:0}
  .sprint-title{flex:1;font-size:.95rem}
  .sprint-sp{color:var(--muted);font-size:.8rem;font-weight:500}
  .sprint-body{padding:0 1rem .8rem;display:none}
  .sprint-body.open{display:block}
  .goal{color:var(--muted);font-size:.85rem;margin:.4rem 0 .8rem;padding:.3rem .2rem}
  table{width:100%;border-collapse:collapse;font-size:.82rem}
  th{background:#F1F5F9;color:#475569;text-transform:uppercase;font-size:.68rem;letter-spacing:.04em;padding:.5rem .6rem;text-align:left;border-bottom:1px solid var(--border)}
  td{padding:.5rem .6rem;border-bottom:1px solid #E2E8F066;vertical-align:top}
  tr:hover{background:#F1F5F955}
  .id{font-family:monospace;color:var(--accent);white-space:nowrap}
  .story{max-width:280px}
  .crit{color:var(--muted);font-size:.78rem;max-width:400px}
  .pri{text-align:center;font-weight:700;font-size:.7rem;text-transform:uppercase}
  .pri.must{color:var(--must)} .pri.should{color:var(--should)}
  .sp{text-align:center;font-weight:600}
  .badge{display:inline-block;padding:.1rem .4rem;border-radius:4px;font-size:.65rem;font-weight:700;text-transform:uppercase;border:1px solid}
  .badge.done{background:#DCFCE7;color:var(--done);border-color:#86EFAC}
  .summary{display:flex;justify-content:space-around;padding:.6rem;border-top:1px solid var(--border);background:#F8FAFC;font-size:.75rem}
  .summary div{text-align:center}
  .summary .n{font-size:1.3rem;font-weight:800;color:var(--accent)}
  .summary .l{color:var(--muted);text-transform:uppercase;font-size:.65rem}
  .dod{margin:1.5rem 0;padding:1rem;border:1px solid var(--border);border-radius:8px;background:var(--card)}
  .dod h3{margin:0 0 .5rem;font-size:1rem}
  .dod ul{margin:0;padding-left:1.2rem;color:var(--muted);font-size:.85rem}
</style>
</head>
<body>
<header>
  <h1>Qlinqen — Product Backlog</h1>
  <p class="subtitle">AI-driven LinkedIn B2B Prospecting Agent | 7 Sprints | Scrum</p>
  <div class="meta">
    <span>Duration: <b>2 weeks</b>/sprint</span>
    <span>Total: <b>~14 weeks</b></span>
    <span>Stories: <b>54</b></span>
    <span>Story Points: <b>297</b></span>
  </div>
</header>
<div class="filters">
  <button class="active" onclick="filter('all')">All</button>
  <button onclick="filter('s1')">Sprint 1</button>
  <button onclick="filter('s2')">Sprint 2</button>
  <button onclick="filter('s3')">Sprint 3</button>
  <button onclick="filter('s4')">Sprint 4</button>
  <button onclick="filter('s5')">Sprint 5</button>
  <button onclick="filter('s6')">Sprint 6</button>
  <button onclick="filter('s7')">Sprint 7</button>
</div>
<div class="container">"""

HTML_FOOT = """
<div class="dod">
  <h3>Definition of Done (All Sprints)</h3>
  <ul>
    <li>Code reviewed and merged to main</li>
    <li>Unit tests passing (Vitest)</li>
    <li>CI/CD pipeline green</li>
    <li>Security scan clean (Semgrep, Trivy, Gitleaks)</li>
    <li>Deployed to staging environment</li>
    <li>Feature validated against acceptance criteria</li>
    <li>Documentation updated (if applicable)</li>
    <li>No critical or high-severity bugs</li>
  </ul>
</div>
</div>
<script>
function toggle(el){const body=el.parentElement.querySelector('.sprint-body');body.classList.toggle('open')}
function filter(s){document.querySelectorAll('.sprint').forEach(sec=>{sec.style.display=(s==='all'||sec.dataset.sprint===s)?'block':'none'});document.querySelectorAll('.filters button').forEach(b=>b.classList.remove('active'));event.target.classList.add('active');if(s==='all'){document.querySelectorAll('.sprint-body').forEach(b=>b.classList.add('open'))}}
document.querySelectorAll('.sprint-body').forEach(b=>b.classList.add('open'));
</script>
</body></html>"""

SPRINT_COLORS = ["#2563EB", "#7C3AED", "#059669", "#D97706", "#EA580C", "#DC2626", "#4F46E5"]

# ── Parse PRODUCT_BACKLOG.md ──────────────────────────────────────────────────
with open("PRODUCT_BACKLOG.md", "r", encoding="utf-8") as f:
    lines = f.readlines()

# Split into sprint blocks by "## Sprint N"
raw_sprints = {}
current = None
for line in lines:
    m = re.match(r"^## Sprint (\d+)\s*\S+\s*(.+)", line)
    if m:
        current = int(m.group(1))
        raw_sprints[current] = {"title": m.group(2).strip().replace("&", "and"), "lines": []}
    elif current:
        raw_sprints[current]["lines"].append(line)

sections = []
for num in sorted(raw_sprints.keys()):
    color = SPRINT_COLORS[num - 1]
    block_lines = raw_sprints[num]["lines"]
    title = raw_sprints[num]["title"]
    goal, deliverable = "", ""
    rows_html = []
    in_goal = False
    in_table = False
    header_skipped = False

    for line in block_lines:
        stripped = line.strip()

        # Goal section
        if stripped == "### Goal":
            in_goal = True
            continue
        if in_goal and stripped and not stripped.startswith("#") and not stripped.startswith("|"):
            goal = stripped
            in_goal = False
            continue

        # Table rows
        if stripped.startswith("|") and "ID" in stripped and "User Story" in stripped:
            in_table = True
            header_skipped = False
            continue
        if in_table and stripped.startswith("|") and re.match(r"\|[-\s|]+\|", stripped):
            header_skipped = True
            continue
        if in_table and stripped.startswith("|") and header_skipped:
            parts = [p.strip() for p in stripped.split("|")]
            parts = [p for p in parts if p != ""]
            if len(parts) >= 5:
                uid = parts[0]
                story = parts[1]
                criteria = parts[2]
                priority = parts[3]
                sp = parts[4]
                pri_cls = priority.lower()
                rows_html.append(
                    f"<tr><td class='id'>{uid}</td><td class='story'>{story}</td>"
                    f"<td class='crit'>{criteria}</td>"
                    f"<td class='pri {pri_cls}'>{priority}</td>"
                    f"<td class='sp'>{sp}</td><td><span class='badge done'>Done</span></td></tr>"
                )
            continue
        if in_table and not stripped.startswith("|"):
            in_table = False

        # Deliverable
        m = re.match(r"\*\*Deliverable:\*\*\s*(.+)", stripped)
        if m:
            deliverable = m.group(1).strip()

    must_count = sum(1 for r in rows_html if "'must'" in r)
    should_count = sum(1 for r in rows_html if "'should'" in r)
    total_sp = sum(int(re.search(r"<td class='sp'>(\d+)</td>", r).group(1)) for r in rows_html if re.search(r"<td class='sp'>(\d+)</td>", r))

    sections.append(f"""<div class="sprint" data-sprint="s{num}">
  <div class="sprint-hdr" style="background:{color}18" onclick="toggle(this)">
    <div class="pill" style="background:{color}">{num}</div>
    <div class="sprint-title">{title}</div>
    <div class="sprint-sp">{total_sp} Story Points</div>
  </div>
  <div class="sprint-body open">
    <p class="goal"><b>Goal:</b> {goal.strip()}</p>
    <table>
      <tr><th>ID</th><th>User Story</th><th>Acceptance Criteria</th><th>Priority</th><th>Story Points</th><th>Status</th></tr>
      {''.join(rows_html)}
    </table>
    <div class="summary"><div><span class="n">{len(rows_html)}</span><span class="l">Stories</span></div>
    <div><span class="n">{total_sp}</span><span class="l">Story Points</span></div>
    <div><span class="n">{must_count}</span><span class="l">Must</span></div>
    <div><span class="n">{should_count}</span><span class="l">Should</span></div>
    <div><span class="n" style="color:var(--done)">Done</span><span class="l">Status</span></div></div>
  </div>
</div>""")

with open("backlog_table.html", "w", encoding="utf-8") as out:
    out.write(HTML_HEAD)
    out.write("\n".join(sections))
    out.write(HTML_FOOT)

print("Generated: backlog_table.html")
