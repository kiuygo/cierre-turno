from PIL import Image, ImageDraw, ImageFont
import os

def create_icon(size, filename):
    img = Image.new('RGBA', (size, size), color=(0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Background rounded square / circle
    margin = int(size * 0.05)
    rect = [margin, margin, size - margin, size - margin]
    radius = int(size * 0.2)
    draw.rounded_rectangle(rect, radius=radius, fill='#00695C')
    
    # Inner accent border
    border_margin = int(size * 0.08)
    border_rect = [border_margin, border_margin, size - border_margin, size - border_margin]
    draw.rounded_rectangle(border_rect, radius=int(radius * 0.85), outline='#86EFAC', width=max(2, int(size * 0.02)))
    
    # Draw Fuel Pump icon or text "BIOCOM"
    # Gas pump nozzle silhouette + text
    cx, cy = size // 2, size // 2
    
    # Draw stylized 'C' / Fuel dispenser
    # Draw main pump body
    bw = int(size * 0.35)
    bh = int(size * 0.45)
    bx = cx - bw // 2
    by = cy - bh // 2 + int(size * 0.05)
    draw.rectangle([bx, by, bx + bw, by + bh], fill='#FFFFFF')
    
    # Display screen
    sw = int(bw * 0.7)
    sh = int(bh * 0.25)
    sx = cx - sw // 2
    sy = by + int(bh * 0.1)
    draw.rectangle([sx, sy, sx + sw, sy + sh], fill='#16A34A')
    
    # Top header banner
    draw.rectangle([bx, by - int(bh*0.12), bx + bw, by], fill='#455A64')
    
    # Pump nozzle line
    nh_x1 = bx + bw
    nh_y1 = by + int(bh * 0.3)
    nh_x2 = nh_x1 + int(size * 0.08)
    nh_y2 = nh_y1 + int(size * 0.2)
    draw.line([(nh_x1, nh_y1), (nh_x2, nh_y1), (nh_x2, nh_y2)], fill='#86EFAC', width=max(3, int(size*0.025)))
    
    img.save(filename, 'PNG')
    print(f"Created {filename}")

base_dir = "/Users/and/Desktop/01 Projects/Cierre_Turno"
create_icon(192, os.path.join(base_dir, "icon-192.png"))
create_icon(512, os.path.join(base_dir, "icon-512.png"))
