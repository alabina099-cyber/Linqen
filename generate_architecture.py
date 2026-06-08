from PIL import Image, ImageDraw, ImageFont
import os

# Canvas size
WIDTH = 1600
HEIGHT = 2350
BG_COLOR = (250, 251, 253)
BORDER_COLOR = (200, 210, 225)
TITLE_COLOR = (15, 23, 42)
SUBTITLE_COLOR = (51, 65, 85)
TEXT_COLOR = (30, 41, 59)
LIGHT_TEXT = (100, 116, 139)
ACCENT_BLUE = (59, 130, 246)
ACCENT_VIOLET = (139, 92, 246)
ACCENT_EMERALD = (16, 185, 129)
ACCENT_ORANGE = (249, 115, 22)
ACCENT_SLATE = (71, 85, 105)
WHITE = (255, 255, 255)
SHADOW = (226, 232, 240)

def hex_to_rgb(hex_color):
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))

def draw_rounded_rect(draw, xy, radius, fill, outline=None, width=1):
    x1, y1, x2, y2 = xy
    draw.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=width)

def draw_arrow(draw, x1, y1, x2, y2, color, width=2):
    draw.line([(x1, y1), (x2, y2)], fill=color, width=width)
    # Arrowhead
    if y2 > y1:  # Down arrow
        draw.polygon([(x2-6, y2-10), (x2+6, y2-10), (x2, y2)], fill=color)
    elif y2 < y1:  # Up arrow
        draw.polygon([(x2-6, y2+10), (x2+6, y2+10), (x2, y2)], fill=color)
    else:  # Horizontal
        if x2 > x1:
            draw.polygon([(x2-10, y2-6), (x2-10, y2+6), (x2, y2)], fill=color)
        else:
            draw.polygon([(x2+10, y2-6), (x2+10, y2+6), (x2, y2)], fill=color)

def get_font(size, bold=False):
    # Try common Windows fonts
    font_names = ["Segoe UI", "Arial", "Helvetica", "DejaVu Sans", "Liberation Sans"]
    for name in font_names:
        try:
            if bold:
                return ImageFont.truetype(name, size)
            else:
                return ImageFont.truetype(name, size)
        except:
            pass
    return ImageFont.load_default()

def create_architecture_diagram():
    img = Image.new('RGB', (WIDTH, HEIGHT), BG_COLOR)
    draw = ImageDraw.Draw(img)
    
    # Try to load fonts
    try:
        font_title = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 32)
        font_subtitle = ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", 20)
        font_header = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 18)
        font_text = ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", 15)
        font_small = ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", 13)
        font_badge = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 14)
    except:
        font_title = ImageFont.load_default()
        font_subtitle = ImageFont.load_default()
        font_header = ImageFont.load_default()
        font_text = ImageFont.load_default()
        font_small = ImageFont.load_default()
        font_badge = ImageFont.load_default()
    
    # ==================== TITLE ====================
    draw.text((WIDTH//2, 40), "AI Agent — Architecture Overview", fill=TITLE_COLOR, font=font_title, anchor="mm")
    draw.text((WIDTH//2, 80), "Three-Tier Agentic Architecture with Human-in-the-Loop Control", fill=SUBTITLE_COLOR, font=font_subtitle, anchor="mm")
    
    # ==================== LAYER 1: FRONTEND ====================
    y_start = 130
    layer1_y = y_start
    layer1_h = 340
    
    # Layer box shadow
    draw_rounded_rect(draw, (40, layer1_y+4, WIDTH-40, layer1_y+layer1_h+4), 16, SHADOW)
    # Layer box
    draw_rounded_rect(draw, (40, layer1_y, WIDTH-40, layer1_y+layer1_h), 16, WHITE, BORDER_COLOR, 2)
    
    # Layer header bar
    draw.rounded_rectangle((40, layer1_y, WIDTH-40, layer1_y+50), radius=16, fill=ACCENT_BLUE)
    # Clip the bottom corners for the header bar
    draw.rectangle((40, layer1_y+25, WIDTH-40, layer1_y+50), fill=ACCENT_BLUE)
    draw.text((WIDTH//2, layer1_y+26), "LAYER 1: FRONTEND", fill=WHITE, font=font_header, anchor="mm")
    
    # AgentChat.tsx box
    box_x, box_y = 80, layer1_y + 70
    box_w, box_h = WIDTH - 160, 240
    draw_rounded_rect(draw, (box_x, box_y+2, box_x+box_w, box_y+box_h+2), 12, SHADOW)
    draw_rounded_rect(draw, (box_x, box_y, box_x+box_w, box_y+box_h), 12, (239, 246, 255), (191, 219, 254), 2)
    
    draw.text((box_x+20, box_y+18), "AgentChat.tsx", fill=ACCENT_BLUE, font=font_badge)
    
    items = [
        ("Chat Thread", "Animated message bubbles, typing indicator, auto-scroll, quick suggestions"),
        ("Activity Feed Panel", "Real-time polling (4s), contextual action controls, unified timeline"),
        ("Conversation History", "Sidebar with persisted conversations, delete with confirmation modal"),
    ]
    
    item_y = box_y + 50
    for title, desc in items:
        # Bullet
        draw.ellipse((box_x+25, item_y+6, box_x+37, item_y+18), fill=ACCENT_BLUE)
        draw.text((box_x+48, item_y), title, fill=TITLE_COLOR, font=font_text)
        draw.text((box_x+48, item_y+22), desc, fill=LIGHT_TEXT, font=font_small)
        item_y += 55
    
    # HTTP arrow label
    draw.text((WIDTH//2, layer1_y+layer1_h+18), "HTTP / Next.js API Routes", fill=LIGHT_TEXT, font=font_small, anchor="mm")
    draw_arrow(draw, WIDTH//2, layer1_y+layer1_h+32, WIDTH//2, layer1_y+layer1_h+52, ACCENT_SLATE, 2)
    
    # ==================== LAYER 2: ORCHESTRATION ====================
    layer2_y = layer1_y + layer1_h + 55
    layer2_h = 420
    
    draw_rounded_rect(draw, (40, layer2_y+4, WIDTH-40, layer2_y+layer2_h+4), 16, SHADOW)
    draw_rounded_rect(draw, (40, layer2_y, WIDTH-40, layer2_y+layer2_h), 16, WHITE, BORDER_COLOR, 2)
    
    draw.rounded_rectangle((40, layer2_y, WIDTH-40, layer2_y+50), radius=16, fill=ACCENT_VIOLET)
    draw.rectangle((40, layer2_y+25, WIDTH-40, layer2_y+50), fill=ACCENT_VIOLET)
    draw.text((WIDTH//2, layer2_y+26), "LAYER 2: ORCHESTRATION", fill=WHITE, font=font_header, anchor="mm")
    
    # POST /api/agent/chat box
    bx, by = 80, layer2_y + 70
    bw, bh = (WIDTH-200)//2, 170
    draw_rounded_rect(draw, (bx, by+2, bx+bw, by+bh+2), 12, SHADOW)
    draw_rounded_rect(draw, (bx, by, bx+bw, by+bh), 12, (245, 243, 255), (216, 203, 253), 2)
    
    draw.text((bx+15, by+14), "POST /api/agent/chat", fill=ACCENT_VIOLET, font=font_badge)
    chat_items = ["Zod validation + JWT auth", "Settings enrichment", "LangChain agent (max 6 rounds)", "History persistence", "Tool step audit trail"]
    cy = by + 45
    for item in chat_items:
        draw.ellipse((bx+18, cy+5, bx+28, cy+15), fill=ACCENT_VIOLET)
        draw.text((bx+35, cy), item, fill=TEXT_COLOR, font=font_small)
        cy += 26
    
    # GET /api/agent/activity box
    bx2 = bx + bw + 40
    draw_rounded_rect(draw, (bx2, by+2, bx2+bw, by+bh+2), 12, SHADOW)
    draw_rounded_rect(draw, (bx2, by, bx2+bw, by+bh), 12, (245, 243, 255), (216, 203, 253), 2)
    
    draw.text((bx2+15, by+14), "GET /api/agent/activity", fill=ACCENT_VIOLET, font=font_badge)
    act_items = ["Parallel SQL queries", "Actions + followups + campaigns", "Tool steps + stats", "Unified timeline", "Scope isolation (RBAC)"]
    cy = by + 45
    for item in act_items:
        draw.ellipse((bx2+18, cy+5, bx2+28, cy+15), fill=ACCENT_VIOLET)
        draw.text((bx2+35, cy), item, fill=TEXT_COLOR, font=font_small)
        cy += 26
    
    # LLM Engine box below
    bx3, by3 = 80, by + bh + 20
    bw3 = WIDTH - 160
    bh3 = 100
    draw_rounded_rect(draw, (bx3, by3+2, bx3+bw3, by3+bh3+2), 12, SHADOW)
    draw_rounded_rect(draw, (bx3, by3, bx3+bw3, by3+bh3), 12, (245, 243, 255), (216, 203, 253), 2)
    
    draw.text((bx3+15, by3+14), "LLM Engine: ChatOpenAI + Tool Binding (bindTools)", fill=ACCENT_VIOLET, font=font_badge)
    draw.text((bx3+15, by3+42), "Model: gpt-4o-mini (default)  |  Temperature: 0.7  |  Max Tokens: 4096  |  System Prompt: 6 Absolute Rules + 6 Workflows", fill=LIGHT_TEXT, font=font_small)
    draw.text((bx3+15, by3+65), "Multi-round loop: LLM plans → calls tools → observes results → iterates (max 6 rounds) → returns final response", fill=LIGHT_TEXT, font=font_small)
    
    # Arrow to Layer 3
    draw.text((WIDTH//2, layer2_y+layer2_h+18), "PostgreSQL + Execution Engines", fill=LIGHT_TEXT, font=font_small, anchor="mm")
    draw_arrow(draw, WIDTH//2, layer2_y+layer2_h+32, WIDTH//2, layer2_y+layer2_h+52, ACCENT_SLATE, 2)
    
    # ==================== LAYER 3: EXECUTION ====================
    layer3_y = layer2_y + layer2_h + 55
    layer3_h = 720
    
    draw_rounded_rect(draw, (40, layer3_y+4, WIDTH-40, layer3_y+layer3_h+4), 16, SHADOW)
    draw_rounded_rect(draw, (40, layer3_y, WIDTH-40, layer3_y+layer3_h), 16, WHITE, BORDER_COLOR, 2)
    
    draw.rounded_rectangle((40, layer3_y, WIDTH-40, layer3_y+50), radius=16, fill=ACCENT_EMERALD)
    draw.rectangle((40, layer3_y+25, WIDTH-40, layer3_y+50), fill=ACCENT_EMERALD)
    draw.text((WIDTH//2, layer3_y+26), "LAYER 3: EXECUTION", fill=WHITE, font=font_header, anchor="mm")
    
    # Queue box (left, top)
    qx, qy = 80, layer3_y + 70
    qw, qh = (WIDTH-200)//2, 260
    draw_rounded_rect(draw, (qx, qy+2, qx+qw, qy+qh+2), 12, SHADOW)
    draw_rounded_rect(draw, (qx, qy, qx+qw, qy+qh), 12, (240, 253, 244), (167, 243, 208), 2)
    
    draw.text((qx+15, qy+14), "LinkedIn Actions Queue", fill=ACCENT_EMERALD, font=font_badge)
    
    status_flow = "pending_approval → approved → processing → completed/failed/rejected/stopped"
    draw.text((qx+15, qy+45), "Status Lifecycle:", fill=TITLE_COLOR, font=font_text)
    draw.text((qx+15, qy+68), status_flow, fill=LIGHT_TEXT, font=font_small)
    
    queue_items = [
        "Concurrency: FOR UPDATE SKIP LOCKED",
        "Recovery: stuck actions auto-released (5min)",
        "Rate Limiter: daily + hourly + delay gates",
        "Anti-dup: 1-hour window for identical actions",
        "Scope: RBAC (admin=team, member=own)"
    ]
    qy2 = qy + 100
    for item in queue_items:
        draw.ellipse((qx+18, qy2+5, qx+28, qy2+15), fill=ACCENT_EMERALD)
        draw.text((qx+35, qy2), item, fill=TEXT_COLOR, font=font_small)
        qy2 += 24
    
    # Execution Engines box (right, top)
    ex = qx + qw + 40
    draw_rounded_rect(draw, (ex, qy+2, ex+qw, qy+qh+2), 12, SHADOW)
    draw_rounded_rect(draw, (ex, qy, ex+qw, qy+qh), 12, (240, 253, 244), (167, 243, 208), 2)
    
    draw.text((ex+15, qy+14), "Execution Engines", fill=ACCENT_EMERALD, font=font_badge)
    
    engine_items = [
        ("Chrome Extension", "Primary engine — uses active LinkedIn session, no stored credentials"),
        ("Puppeteer Worker", "Fallback — Dockerized, anti-detection, shared browser + restart"),
    ]
    ey = qy + 50
    for title, desc in engine_items:
        draw.ellipse((ex+18, ey+5, ex+28, ey+15), fill=ACCENT_EMERALD)
        draw.text((ex+35, ey), title, fill=TITLE_COLOR, font=font_text)
        draw.text((ex+35, ey+22), desc, fill=LIGHT_TEXT, font=font_small)
        ey += 55
    
    # Rate Limiter box (left, below queue)
    rx, ry = qx, qy + qh + 20
    rw, rh = qw, 170
    draw_rounded_rect(draw, (rx, ry+2, rx+rw, ry+rh+2), 12, SHADOW)
    draw_rounded_rect(draw, (rx, ry, rx+rw, ry+rh), 12, (255, 251, 235), (253, 230, 138), 2)
    
    draw.text((rx+15, ry+14), "Rate Limiter (3 Gates)", fill=ACCENT_ORANGE, font=font_badge)
    
    gate_items = [
        "Gate 1: Daily limit (conn: 20/day, msg: 30/day, visit: 50/day)",
        "Gate 2: Hourly limit (conn: 5/hr, msg: 8/hr, visit: 15/hr)",
        "Gate 3: Inter-action delay (conn: 2min, msg: 90s, visit: 20s)"
    ]
    gy = ry + 45
    for item in gate_items:
        draw.ellipse((rx+18, gy+5, rx+28, gy+15), fill=ACCENT_ORANGE)
        draw.text((rx+35, gy), item, fill=TEXT_COLOR, font=font_small)
        gy += 28
    
    # Tool Registry box (right, below engines) — wider
    tx, ty = ex, ry
    tw, th = qw, 210
    draw_rounded_rect(draw, (tx, ty+2, tx+tw, ty+th+2), 12, SHADOW)
    draw_rounded_rect(draw, (tx, ty, tx+tw, ty+th), 12, (255, 251, 235), (253, 230, 138), 2)
    
    draw.text((tx+15, ty+14), "Tool Registry (16 Tools)", fill=ACCENT_ORANGE, font=font_badge)
    
    tool_cats = [
        "LinkedIn: search, visit, connect, message",
        "Intelligence: analyze, generate_msg, strategy",
        "Database: search_db, save, stats, followup",
        "Campaigns: create, update, execute",
        "Compliance: rate_limits, network_check"
    ]
    ty2 = ty + 45
    for item in tool_cats:
        draw.ellipse((tx+18, ty2+5, tx+28, ty2+15), fill=ACCENT_ORANGE)
        draw.text((tx+35, ty2), item, fill=TEXT_COLOR, font=font_small)
        ty2 += 24
    
    # Worker loop box (bottom, full width)
    # Position below the TALLEST of the two upper boxes to avoid overlap
    wx, wy = 80, max(ry + rh, ty + th) + 30
    ww, wh = WIDTH - 160, 130
    draw_rounded_rect(draw, (wx, wy+2, wx+ww, wy+wh+2), 12, SHADOW)
    draw_rounded_rect(draw, (wx, wy, wx+ww, wy+wh), 12, (240, 253, 244), (167, 243, 208), 2)
    
    draw.text((wx+15, wy+14), "Worker Loop", fill=ACCENT_EMERALD, font=font_badge)
    draw.text((wx+15, wy+42), "1. Poll queue → claim action (FOR UPDATE SKIP LOCKED) → execute → update status", fill=LIGHT_TEXT, font=font_small)
    draw.text((wx+15, wy+65), "2. Heartbeat every 30s  |  Recovery every 60s  |  Back-off after 10 consecutive errors", fill=LIGHT_TEXT, font=font_small)
    draw.text((wx+15, wy+88), "3. Browser restart every 20 uses  |  Graceful shutdown on SIGTERM/SIGINT  |  60s pause on error burst", fill=LIGHT_TEXT, font=font_small)
    
    # ==================== LEGEND ====================
    ly = HEIGHT - 80
    draw.text((80, ly), "Legend:", fill=TITLE_COLOR, font=font_text)
    draw.ellipse((160, ly+3, 175, ly+18), fill=ACCENT_BLUE)
    draw.text((185, ly), "Frontend", fill=LIGHT_TEXT, font=font_small)
    draw.ellipse((280, ly+3, 295, ly+18), fill=ACCENT_VIOLET)
    draw.text((305, ly), "Orchestration", fill=LIGHT_TEXT, font=font_small)
    draw.ellipse((420, ly+3, 435, ly+18), fill=ACCENT_EMERALD)
    draw.text((445, ly), "Execution", fill=LIGHT_TEXT, font=font_small)
    draw.ellipse((540, ly+3, 555, ly+18), fill=ACCENT_ORANGE)
    draw.text((565, ly), "Compliance & Tools", fill=LIGHT_TEXT, font=font_small)
    
    # Border frame
    draw.rounded_rectangle((20, 20, WIDTH-20, HEIGHT-20), radius=20, outline=(203, 213, 225), width=2)
    
    # Save
    output_path = "C:/Users/OrdiOne/Desktop/LinkedInProject/les rapports/agent-architecture-overview.png"
    img.save(output_path, "PNG", dpi=(300, 300))
    print(f"Image saved to: {output_path}")
    return output_path

if __name__ == "__main__":
    create_architecture_diagram()
