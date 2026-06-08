from PIL import Image, ImageDraw, ImageFont
import os

# Canvas size
W, H = 1000, 1320
img = Image.new('RGB', (W, H), '#f8fafc')
draw = ImageDraw.Draw(img)

def hex_to_rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

def draw_rounded_rect(draw, xy, radius, fill, outline=None, width=1):
    x1, y1, x2, y2 = xy
    draw.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=width)

def draw_arrow(draw, x, y1, y2, label, label_color="#64748b"):
    # Arrow line
    draw.line([(x, y1), (x, y2)], fill="#94a3b8", width=2)
    # Arrow head
    draw.polygon([(x-6, y2), (x+6, y2), (x, y2+8)], fill="#94a3b8")
    # Label
    if label:
        try:
            font = ImageFont.truetype("segoeui.ttf", 12)
        except:
            font = ImageFont.load_default()
        bbox = draw.textbbox((0,0), label, font=font)
        tw = bbox[2] - bbox[0]
        draw.text((x - tw - 14, (y1+y2)//2 - 7), label, fill=label_color, font=font)

# Try to load fonts
try:
    font_title = ImageFont.truetype("segoeui.ttf", 24)
    font_layer = ImageFont.truetype("segoeui.ttf", 14)
    font_bold = ImageFont.truetype("segoeuib.ttf", 14)
    font_item = ImageFont.truetype("segoeui.ttf", 13)
    font_sub = ImageFont.truetype("segoeui.ttf", 11)
    font_dot = ImageFont.truetype("segoeuib.ttf", 20)
except:
    font_title = ImageFont.load_default()
    font_layer = ImageFont.load_default()
    font_bold = ImageFont.load_default()
    font_item = ImageFont.load_default()
    font_sub = ImageFont.load_default()
    font_dot = ImageFont.load_default()

# Title
title = "BI Module — Full-Stack Architecture"
bbox = draw.textbbox((0,0), title, font=font_title)
tw = bbox[2] - bbox[0]
draw.text(((W-tw)//2, 30), title, fill="#1e293b", font=font_title)

# Layer dimensions
layer_x = 60
layer_w = W - 120
radius = 14
item_radius = 8

def draw_layer(y, h, title_text, title_color, bg_color, border_color, dot_color, items, note=None):
    # Layer background
    draw.rounded_rectangle([layer_x, y, layer_x+layer_w, y+h], radius=radius, fill=bg_color, outline=border_color, width=1)
    # Header dot + title
    draw.ellipse([layer_x+20, y+18, layer_x+32, y+30], fill=dot_color)
    draw.text((layer_x+40, y+16), title_text, fill=title_color, font=font_layer)
    
    if note:
        # Note box
        ny = y + 44
        draw.rounded_rectangle([layer_x+16, ny, layer_x+layer_w-16, ny+38], radius=6, fill="white", outline=border_color, width=1)
        # Dashed effect via small lines
        draw.text((layer_x+26, ny+9), note, fill=title_color, font=font_sub)
        item_y = ny + 48
    else:
        item_y = y + 44
    
    # Items grid
    cols = 2 if len(items) <= 6 else 2
    item_w = (layer_w - 48 - (cols-1)*10) // cols
    
    for i, (name, sub) in enumerate(items):
        col = i % cols
        row = i // cols
        ix = layer_x + 16 + col * (item_w + 10)
        iy = item_y + row * 54
        draw.rounded_rectangle([ix, iy, ix+item_w, iy+46], radius=item_radius, fill="white", outline="#e2e8f0", width=1)
        draw.text((ix+10, iy+6), name, fill="#334155", font=font_item)
        draw.text((ix+10, iy+24), sub, fill="#64748b", font=font_sub)
    
    return y + h

# Frontend layer
frontend_items = [
    ("KPIHero", "6 KPIs + delta"),
    ("ConversionIntelligence", "Sankey, funnel, cohorts"),
    ("AIInsights", "Narrative insights"),
    ("TemplateLab", "Pattern mining, heatmap"),
    ("AgentAnalytics", "ROI, timeline"),
    ("ProspectMap", "Treemap, ICP quadrant"),
    ("Forecast", "OLS regression, what-if"),
    ("BIShell", "Range filter, CSV/PDF"),
]
frontend_note = "BIShell — Central orchestrator: Promise.all(4 parallel API calls) → shared state via props"
y1 = 80
h1 = 44 + 40 + (len(frontend_items)//2 + (1 if len(frontend_items)%2 else 0)) * 54 + 20
y2 = draw_layer(y1, h1, "FRONTEND  (React / Next.js)", "#1e40af", "#eff6ff", "#bfdbfe", "#2563eb", frontend_items, frontend_note)

# Arrow 1: Frontend → Backend
draw_arrow(draw, W//2, y2, y2+44, "HTTP / REST (GET)")

# Backend layer
backend_items = [
    ("/api/bi/kpi", "6 KPIs + period comp"),
    ("/api/bi/conversion", "Funnel, cycle time"),
    ("/api/bi/templates", "Patterns, n-grams"),
    ("/api/bi/geo", "Geography, industries"),
    ("/api/bi/agent", "Tools, ROI, approvals"),
    ("/api/bi/forecast", "Linear regression"),
    ("/api/bi/analytics", "Aggregated summary"),
]
y3 = y2 + 44
h3 = 44 + (len(backend_items)//2 + (1 if len(backend_items)%2 else 0)) * 54 + 24
y4 = draw_layer(y3, h3, "BACKEND  (Next.js API Routes)", "#92400e", "#fffbeb", "#fde68a", "#d97706", backend_items)

# Arrow 2: Backend → Database
draw_arrow(draw, W//2, y4, y4+44, "node-postgres (pg)")

# Database layer
y5 = y4 + 44
# Draw database layer manually for table chips
h5 = 130
bg = "#f5f3ff"
draw.rounded_rectangle([layer_x, y5, layer_x+layer_w, y5+h5], radius=radius, fill=bg, outline="#ddd6fe", width=1)
draw.ellipse([layer_x+20, y5+18, layer_x+32, y5+30], fill="#7c3aed")
draw.text((layer_x+40, y5+16), "DATABASE  (PostgreSQL / NeonDB — Cloud)", fill="#5b21b6", font=font_layer)

tables = ["prospects", "messages", "agent_tool_steps", "linkedin_actions_queue", "agent_chat_history", "campaigns"]
tx = layer_x + 16
ty = y5 + 50
for t in tables:
    bbox = draw.textbbox((0,0), t, font=font_sub)
    tw = bbox[2] - bbox[0] + 20
    draw.rounded_rectangle([tx, ty, tx+tw, ty+30], radius=6, fill="white", outline="#c4b5fd", width=1)
    draw.text((tx+10, ty+7), t, fill="#5b21b6", font=font_sub)
    tx += tw + 10
    if tx > layer_x + layer_w - 120:
        tx = layer_x + 16
        ty += 38

# Save
output_path = os.path.join(os.path.dirname(__file__), "architecture-diagram.png")
img.save(output_path, "PNG", dpi=(300,300))
print(f"Saved: {output_path}")
