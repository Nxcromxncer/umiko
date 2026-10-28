"""Analyze screenshot color composition to verify the underwater scene renders."""
from PIL import Image
import sys

def analyze(path: str) -> None:
    img = Image.open(path).convert("RGB")
    w, h = img.size
    px = img.load()

    # Sample grid
    total = 0
    blue_rich = 0      # pixels where blue dominates strongly (water/fish)
    bright = 0         # notably bright pixels (fish highlights, surface)
    cyan = 0           # cyan-ish (65E6FF-like highlights)
    white_ish = 0      # near-white (typography)
    pure_black = 0     # pure black background

    step = max(1, w // 200)
    for y in range(0, h, step):
        for x in range(0, w, step):
            r, g, b = px[x, y]
            total += 1
            lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
            if lum < 12:
                pure_black += 1
            if b > 60 and b > r * 1.6 and b > g * 1.15:
                blue_rich += 1
            if lum > 150:
                bright += 1
            if b > 140 and g > 130 and r < 120:
                cyan += 1
            if r > 200 and g > 200 and b > 200:
                white_ish += 1

    print(f"image: {path}  ({w}x{h})")
    print(f"  pure black     : {pure_black / total * 100:5.1f}%   (dark base)")
    print(f"  blue-rich      : {blue_rich / total * 100:5.1f}%   (water + koi)")
    print(f"  cyan highlights: {cyan / total * 100:5.1f}%   (glow accents)")
    print(f"  bright pixels  : {bright / total * 100:5.1f}%   (fish/surface light)")
    print(f"  white-ish      : {white_ish / total * 100:5.1f}%   (typography)")

    # Region analysis: where is the blue concentrated?
    regions = {
        "top-left": (0, 0, w // 3, h // 3),
        "top-center": (w // 3, 0, 2 * w // 3, h // 3),
        "top-right": (2 * w // 3, 0, w, h // 3),
        "mid-left": (0, h // 3, w // 3, 2 * h // 3),
        "mid-center": (w // 3, h // 3, 2 * w // 3, 2 * h // 3),
        "mid-right": (2 * w // 3, h // 3, w, 2 * h // 3),
        "bottom-left": (0, 2 * h // 3, w // 3, h),
        "bottom-center": (w // 3, 2 * h // 3, 2 * w // 3, h),
        "bottom-right": (2 * w // 3, 2 * h // 3, w, h),
    }
    print("  region avg RGB:")
    for name, (x0, y0, x1, y1) in regions.items():
        rs = gs = bs = n = 0
        for y in range(y0, y1, max(1, (y1 - y0) // 30)):
            for x in range(x0, x1, max(1, (x1 - x0) // 30)):
                r, g, b = px[x, y]
                rs += r; gs += g; bs += b; n += 1
        print(f"    {name:14s}: ({rs//n:3d}, {gs//n:3d}, {bs//n:3d})")

if __name__ == "__main__":
    for p in sys.argv[1:]:
        analyze(p)
        print()
