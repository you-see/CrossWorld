from pathlib import Path
import shapefile
import matplotlib.pyplot as plt

# =========================================================
# Paths
# =========================================================

BASE_DIR = Path(__file__).resolve().parent
INPUT = BASE_DIR / "ne_10m_admin_0_countries.shp"
OUTPUT = BASE_DIR / "cartoon_earth.png"

# =========================================================
# Settings
# =========================================================

WIDTH = 2048
HEIGHT = 1024

# =========================================================
# Cartoon Palette (Vibrant & Playful)
# =========================================================

# اقیانوس: یک آبی روشن و شاد (Sky Blue / Azure)
OCEAN_COLOR = "#4CC9F0" 

# خشکی: سبز زنده و شاد (Grass Green)
LAND_COLOR = "#4CAF50" 

# حاشیه: مشکی ضخیم (برای ایجاد استایل کارتون/کمیک)
BORDER_COLOR = "#2B2D42" 

# =========================================================
# Check input
# =========================================================

if not INPUT.exists():
    raise FileNotFoundError(f"Shapefile not found at:\n{INPUT}")

print("Reading shapefile for cartoon style...")
reader = shapefile.Reader(str(INPUT))
shapes = reader.shapes()

# =========================================================
# Create Figure
# =========================================================

fig = plt.figure(figsize=(WIDTH / 100, HEIGHT / 100), dpi=100)
ax = fig.add_axes([0, 0, 1, 1])

# تنظیم رنگ پس‌زمینه (اقیانوس)
ax.set_facecolor(OCEAN_COLOR)

# =========================================================
# Draw Land (Cartoon Style)
# =========================================================

print("Rendering cartoon world...")
for index, shape in enumerate(shapes):
    points = shape.points
    parts = list(shape.parts)
    parts.append(len(points))

    for part_index in range(len(parts) - 1):
        start = parts[part_index]
        end = parts[part_index + 1]
        ring = points[start:end]

        if len(ring) < 3:
            continue

        xs = [p[0] for p in ring]
        ys = [p[1] for p in ring]

        # استایل کارتونی:
        # 1. حاشیه ضخیم و مشکی (linewidth بالا)
        # 2. رنگ خشکی کاملاً یکدست و زنده
        ax.fill(
            xs,
            ys,
            facecolor=LAND_COLOR,
            edgecolor=BORDER_COLOR,
            linewidth=1.2,  # افزایش ضخامت برای حس کارتون
            joinstyle='round', # نرم کردن گوشه‌های تیز برای حس دوستانه/کارتونی
            capstyle='round'
        )

    if index % 50 == 0:
        print(f"Progress: {index + 1}/{len(shapes)}")

# =========================================================
# Geographic Bounds & Cleanup
# =========================================================

ax.set_xlim(-180, 180)
ax.set_ylim(-90, 90)
ax.axis("off")

# =========================================================
# Save
# =========================================================

print(f"Saving cartoon map to: {OUTPUT}")
fig.savefig(
    OUTPUT,
    dpi=100,
    facecolor=OCEAN_COLOR,
    edgecolor="none",
    bbox_inches="tight",
    pad_inches=0,
)

plt.close(fig)
print("================================")
print("Done! Your Cartoon Map is ready! 🎨")
print("================================")
