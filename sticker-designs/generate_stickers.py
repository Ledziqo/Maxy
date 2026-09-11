from pathlib import Path

import qrcode
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT = Path(__file__).resolve().parent
LOGO_PATH = ROOT / "images" / "maxrez-logo.png"

RED = "#b82931"
INK = "#171313"
PAPER = "#f7f3ef"
MUTED = "#605550"
WHITE = "#ffffff"

FONT_REGULAR = r"C:\Windows\Fonts\arial.ttf"
FONT_BOLD = r"C:\Windows\Fonts\arialbd.ttf"


def font(size, bold=False):
    return ImageFont.truetype(FONT_BOLD if bold else FONT_REGULAR, size)


def rounded_canvas(size, radius, fill=PAPER):
    canvas = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)
    draw.rounded_rectangle((4, 4, size[0] - 5, size[1] - 5), radius, fill=fill, outline=RED, width=8)
    return canvas, draw


def logo_for(width):
    logo = Image.open(LOGO_PATH).convert("RGBA")
    bbox = logo.getbbox()
    logo = logo.crop(bbox)
    height = round(width * logo.height / logo.width)
    return logo.resize((width, height), Image.Resampling.LANCZOS)


def qr_for(size):
    qr = qrcode.QRCode(version=None, error_correction=qrcode.constants.ERROR_CORRECT_H, box_size=10, border=4)
    qr.add_data("https://maxrez.cc")
    qr.make(fit=True)
    return qr.make_image(fill_color=INK, back_color=WHITE).convert("RGBA").resize((size, size), Image.Resampling.NEAREST)


def centered(draw, text, y, width, face, fill=INK):
    box = draw.textbbox((0, 0), text, font=face)
    x = (width - (box[2] - box[0])) // 2
    draw.text((x, y), text, font=face, fill=fill)


def pill(draw, xy, label, face, fill=RED, text_fill=WHITE):
    draw.rounded_rectangle(xy, radius=(xy[3] - xy[1]) // 2, fill=fill)
    box = draw.textbbox((0, 0), label, font=face)
    x = (xy[0] + xy[2] - (box[2] - box[0])) // 2
    y = (xy[1] + xy[3] - (box[3] - box[1])) // 2 - box[1]
    draw.text((x, y), label, font=face, fill=text_fill)


def make_square():
    w = h = 827
    im, d = rounded_canvas((w, h), 52)
    logo = logo_for(440)
    im.alpha_composite(logo, ((w - logo.width) // 2, 50))
    centered(d, "YOUR ONE-STOP PRINT SHOP", 184, w, font(28, True), INK)
    centered(d, "Design  •  Print  •  Package", 231, w, font(26), MUTED)
    d.line((60, 284, w - 60, 284), fill="#ded6d0", width=2)
    qr = qr_for(270)
    im.alpha_composite(qr, (60, 309))
    d.text((366, 336), "NEED PRINTING?", font=font(30, True), fill=INK)
    d.text((366, 386), "Order or get a quote", font=font(26), fill=MUTED)
    d.text((366, 433), "maxrez.cc", font=font(30, True), fill=INK)
    pill(d, (366, 495, 759, 557), "SCAN TO ORDER", font(25, True))
    d.line((60, 594, w - 60, 594), fill="#ded6d0", width=2)
    centered(d, "+251 911 207 630", 608, w, font(28, True), INK)
    centered(d, "Telegram: @Maxrezplc", 648, w, font(25), INK)
    centered(d, "maxrezgraphics@gmail.com", 687, w, font(26, True), INK)
    centered(d, "Gabon Street, Woreda 02", 729, w, font(25), MUTED)
    centered(d, "House No. 359, Addis Ababa", 761, w, font(25), MUTED)
    im.save(OUT / "maxrez-sticker-square-7x7cm.png", dpi=(300, 300))


def make_wide():
    w, h = 1181, 591
    im, d = rounded_canvas((w, h), 48)
    logo = logo_for(470)
    im.alpha_composite(logo, (65, 62))
    d.text((70, 245), "YOUR ONE-STOP PRINT SHOP", font=font(26, True), fill=INK)
    d.text((70, 294), "Graphic design  •  Digital & offset printing", font=font(24), fill=MUTED)
    d.text((70, 334), "Labels  •  Packaging  •  Large format", font=font(24), fill=MUTED)
    d.text((70, 403), "+251 911 207 630   •   Telegram @Maxrezplc", font=font(25, True), fill=INK)
    d.text((70, 447), "maxrezgraphics@gmail.com", font=font(27, True), fill=INK)
    d.text((70, 494), "Gabon Street, Woreda 02", font=font(25), fill=MUTED)
    d.text((70, 530), "House No. 359, Addis Ababa", font=font(25), fill=MUTED)
    d.line((810, 58, 810, h - 58), fill="#ded6d0", width=3)
    qr = qr_for(290)
    im.alpha_composite(qr, (855, 90))
    d.text((946, 393), "maxrez.cc", font=font(22, True), fill=INK)
    pill(d, (855, 438, 1145, 496), "SCAN TO ORDER", font(19, True))
    d.text((902, 518), "Order or get a quote", font=font(18), fill=MUTED)
    im.save(OUT / "maxrez-sticker-wide-10x5cm.png", dpi=(300, 300))


def make_portrait():
    w, h = 945, 1417
    im, d = rounded_canvas((w, h), 58, PAPER)
    logo = logo_for(610)
    im.alpha_composite(logo, ((w - logo.width) // 2, 118))
    centered(d, "YOUR ONE-STOP PRINT SHOP", 355, w, font(33, True), INK)
    centered(d, "From the first idea to the finished piece.", 410, w, font(24), MUTED)

    services = [
        "Graphic Design",
        "Digital Printing",
        "Offset Printing",
        "Film Output & CTP",
        "Large-Format Printing",
        "Labels & Stickers",
        "Packaging & Finishing",
    ]
    y = 500
    for item in services:
        d.ellipse((112, y + 8, 128, y + 24), fill=RED)
        d.text((155, y), item, font=font(27, True), fill=INK)
        y += 62

    d.rounded_rectangle((72, 920, w - 72, 1238), radius=24, fill=PAPER, outline="#ded6d0", width=2)
    qr = qr_for(290)
    im.alpha_composite(qr, (92, 934))
    d.text((425, 957), "READY TO PRINT?", font=font(29, True), fill=INK)
    d.text((425, 1011), "Order or get a quote", font=font(27), fill=MUTED)
    d.text((425, 1060), "maxrez.cc", font=font(33, True), fill=INK)
    pill(d, (425, 1141, 827, 1205), "SCAN TO ORDER", font(25, True))
    centered(d, "+251 911 207 630  •  Telegram @Maxrezplc", 1250, w, font(27, True), INK)
    centered(d, "maxrezgraphics@gmail.com", 1288, w, font(28, True), INK)
    centered(d, "Gabon Street, Woreda 02", 1329, w, font(25), MUTED)
    centered(d, "House No. 359, Addis Ababa", 1360, w, font(25), MUTED)
    im.save(OUT / "maxrez-sticker-portrait-8x12cm.png", dpi=(300, 300))


def make_preview():
    files = [
        OUT / "maxrez-sticker-square-7x7cm.png",
        OUT / "maxrez-sticker-wide-10x5cm.png",
        OUT / "maxrez-sticker-portrait-8x12cm.png",
    ]
    preview = Image.new("RGB", (2000, 1450), "#e9e0da")
    d = ImageDraw.Draw(preview)
    d.text((80, 58), "MAXREZ STICKER SYSTEM", font=font(42, True), fill=INK)
    d.text((80, 115), "Three formats. One recognizable brand.", font=font(27), fill=MUTED)

    square = Image.open(files[0]).convert("RGBA").resize((560, 560), Image.Resampling.LANCZOS)
    wide = Image.open(files[1]).convert("RGBA").resize((760, 380), Image.Resampling.LANCZOS)
    portrait = Image.open(files[2]).convert("RGBA").resize((500, 750), Image.Resampling.LANCZOS)
    preview.paste(square, (180, 235), square)
    preview.paste(wide, (80, 930), wide)
    portrait = Image.open(files[2]).convert("RGBA").resize((720, 1080), Image.Resampling.LANCZOS)
    preview.paste(portrait, (1110, 235), portrait)
    d.text((360, 818), "7 × 7 cm", font=font(27, True), fill=INK)
    d.text((355, 1332), "10 × 5 cm", font=font(27, True), fill=INK)
    d.text((1360, 1332), "8 × 12 cm", font=font(27, True), fill=INK)
    preview.save(OUT / "maxrez-sticker-set-preview.png")


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    make_square()
    make_wide()
    make_portrait()
    make_preview()
