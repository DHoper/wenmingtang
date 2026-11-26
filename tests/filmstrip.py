"""換頁過場連拍：每 80ms 一張，拼成一條，用眼睛看順不順。python tests/filmstrip.py 輸出.png"""
import os, sys
from PIL import Image
from playwright.sync_api import sync_playwright
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); from fake_worker import fake_worker
out = sys.argv[1]
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_context(viewport={"width": 390, "height": 844}, has_touch=True).new_page(); fake_worker(pg)
    pg.goto("http://127.0.0.1:8765/"); pg.wait_for_selector("#enter:not([disabled])")
    pg.click("#enter"); pg.wait_for_timeout(1200); pg.click("[data-m=read]"); pg.wait_for_timeout(800)
    pg.fill("#nameIn", "林家豪"); pg.dispatch_event("#nameIn", "input"); pg.wait_for_timeout(800)
    rows = []
    def burst(action, n=11, gap=80):
        frames = []
        action()
        for i in range(n):
            frames.append(Image.open(__import__("io").BytesIO(pg.screenshot())).resize((195, 422)))
            pg.wait_for_timeout(gap)
        rows.append(frames)
    burst(lambda: pg.click("#nameOk"))
    pg.wait_for_timeout(600)
    burst(lambda: pg.click("[data-g=m]"), n=13)
    pg.wait_for_timeout(600); pg.click("#noCard"); pg.wait_for_timeout(1200)
    pg.click("#goCount"); pg.click(".skip"); pg.wait_for_timeout(100)
    burst(lambda: None, n=11, gap=90)
    b.close()
W = max(len(r) for r in rows)
s = Image.new("RGB", (W * 197, len(rows) * 424), "white")
for j, r in enumerate(rows):
    for i, f in enumerate(r): s.paste(f, (i * 197, j * 424))
s.save(out); print("ok")
