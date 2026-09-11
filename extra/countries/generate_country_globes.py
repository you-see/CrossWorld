from pathlib import Path
import math

from PIL import Image, ImageDraw, ImageFilter, ImageFont


SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent

INPUT_DIR = PROJECT_ROOT / "public" / "data" / "countries"
OUTPUT_DIR = PROJECT_ROOT / "public" / "data" / "maps"
FLAGS_DIR = PROJECT_ROOT / "public" / "data" / "flags"


WIDTH = 800
HEIGHT = 800

CX = WIDTH / 2
CY = HEIGHT / 2

RADIUS = 330


BACKGROUND = (0, 0, 0, 0)

OCEAN = "#1677c8"
LAND = "#46be55"
HIGHLIGHT = "#46be55"

BORDER = "#2f7d3a"
SELECTED_BORDER = "#ff1010"
GLOBE_BORDER = "#515875"

SCALE = 10000


FLAG_WIDTH = 72
FLAG_HEIGHT = 48

FLAG_OFFSET = 28

FLAG_BORDER = (255, 255, 255, 180)
FLAG_BORDER_WIDTH = 1


# ---------------------------------------------------------
# Watermark
# ---------------------------------------------------------

WATERMARK_TEXT = "CrossWorld"
WATERMARK_FONT_SIZE = 12
WATERMARK_COLOR = (255, 255, 255, 200)

WATERMARK_MARGIN = 36


# Manual flag position adjustments.
# Values are X/Y pixel offsets.
FLAG_MANUAL_OFFSETS = {
    "USA": (0, 0),
    "NZL": (0, 0),
}


# ---------------------------------------------------------
# CWB decoder
# ---------------------------------------------------------

def read_varuint(data, offset):
    result = 0
    shift = 0

    while True:

        if offset[0] >= len(data):
            raise ValueError(
                "Unexpected end of CWB file"
            )

        byte = data[offset[0]]
        offset[0] += 1

        result |= (
            (byte & 0x7F)
            << shift
        )

        if (byte & 0x80) == 0:
            return result

        shift += 7

        if shift > 35:
            raise ValueError(
                "Invalid VarUInt"
            )


def unzigzag(value):
    return (
        value >> 1
    ) ^ -(
        value & 1
    )


def decode_cwb(data):

    if len(data) < 10:
        raise ValueError(
            "CWB file is too small"
        )

    if data[:4] != b"CWB1":
        raise ValueError(
            "Invalid CWB magic"
        )

    version = (
        data[4]
        | (data[5] << 8)
    )

    if version != 1:
        raise ValueError(
            f"Unsupported CWB version: {version}"
        )

    ring_count = (
        data[6]
        | (data[7] << 8)
        | (data[8] << 16)
        | (data[9] << 24)
    )

    offset = [10]

    rings = []

    for _ in range(ring_count):

        if offset[0] + 4 > len(data):
            raise ValueError(
                "Invalid CWB ring header"
            )

        length = (
            data[offset[0]]
            | (data[offset[0] + 1] << 8)
            | (data[offset[0] + 2] << 16)
            | (data[offset[0] + 3] << 24)
        )

        offset[0] += 4

        ring_end = (
            offset[0] + length
        )

        if ring_end > len(data):
            raise ValueError(
                "Invalid CWB ring length"
            )

        previous_x = 0
        previous_y = 0

        ring = []

        while offset[0] < ring_end:

            dx = unzigzag(
                read_varuint(
                    data,
                    offset,
                )
            )

            dy = unzigzag(
                read_varuint(
                    data,
                    offset,
                )
            )

            previous_x += dx
            previous_y += dy

            longitude = (
                previous_x / SCALE
            )

            latitude = (
                previous_y / SCALE
            )

            if (
                math.isfinite(longitude)
                and math.isfinite(latitude)
            ):
                ring.append(
                    (
                        longitude,
                        latitude,
                    )
                )

        if len(ring) >= 3:
            rings.append(ring)

    return {
        "rings": rings
    }


# ---------------------------------------------------------
# Longitude helpers
# ---------------------------------------------------------

def normalize_longitude(value):

    while value > 180:
        value -= 360

    while value < -180:
        value += 360

    return value


def longitude_difference(
    longitude,
    center,
):

    diff = normalize_longitude(
        longitude - center
    )

    if diff > 180:
        diff -= 360

    if diff < -180:
        diff += 360

    return diff


# ---------------------------------------------------------
# Country center
# ---------------------------------------------------------

def get_center(country):

    x = 0.0
    y = 0.0
    z = 0.0

    for ring in country["rings"]:

        for longitude, latitude in ring:

            lat = math.radians(
                latitude
            )

            lon = math.radians(
                longitude
            )

            cos_lat = math.cos(lat)

            x += (
                cos_lat
                * math.cos(lon)
            )

            y += math.sin(lat)

            z += (
                cos_lat
                * math.sin(lon)
            )

    length = math.sqrt(
        x * x
        + y * y
        + z * z
    )

    if length == 0:
        return 0.0, 0.0

    longitude = math.degrees(
        math.atan2(z, x)
    )

    latitude = math.degrees(
        math.asin(
            y / length
        )
    )

    return longitude, latitude


# ---------------------------------------------------------
# Orthographic projection
# ---------------------------------------------------------

def project(
    longitude,
    latitude,
    center_longitude,
    center_latitude,
):

    lon = math.radians(
        longitude_difference(
            longitude,
            center_longitude,
        )
    )

    lat = math.radians(
        latitude
    )

    center_lat = math.radians(
        center_latitude
    )

    x = (
        math.cos(lat)
        * math.sin(lon)
    )

    y = (
        math.cos(center_lat)
        * math.sin(lat)
        -
        math.sin(center_lat)
        * math.cos(lat)
        * math.cos(lon)
    )

    z = (
        math.sin(center_lat)
        * math.sin(lat)
        +
        math.cos(center_lat)
        * math.cos(lat)
        * math.cos(lon)
    )

    screen_x = (
        CX + x * RADIUS
    )

    screen_y = (
        CY - y * RADIUS
    )

    return (
        screen_x,
        screen_y,
        z >= 0,
    )


# ---------------------------------------------------------
# Find northernmost visible point
# ---------------------------------------------------------

def get_northernmost_point(
    country,
    center_lon,
    center_lat,
):

    best = None

    for ring in country["rings"]:

        for longitude, latitude in ring:

            x, y, visible = project(
                longitude,
                latitude,
                center_lon,
                center_lat,
            )

            if not visible:
                continue

            if best is None:

                best = (
                    longitude,
                    latitude,
                    x,
                    y,
                )

            elif latitude > best[1]:

                best = (
                    longitude,
                    latitude,
                    x,
                    y,
                )

    return best


# ---------------------------------------------------------
# Load flag
# ---------------------------------------------------------

def load_flag(iso):

    flag_path = (
        FLAGS_DIR
        / f"{iso}.png"
    )

    if not flag_path.is_file():

        print(
            f"[FLAG] Missing: "
            f"{iso}.png"
        )

        return None

    try:

        return Image.open(
            flag_path
        ).convert("RGBA")

    except Exception as error:

        print(
            f"[FLAG] Failed to load "
            f"{iso}: {error}"
        )

        return None


# ---------------------------------------------------------
# Prepare flag
# ---------------------------------------------------------

def prepare_flag(flag):

    if flag is None:
        return None

    original_width, original_height = (
        flag.size
    )

    if (
        original_width <= 0
        or original_height <= 0
    ):
        return None

    scale_x = (
        FLAG_WIDTH
        / original_width
    )

    scale_y = (
        FLAG_HEIGHT
        / original_height
    )

    scale = min(
        scale_x,
        scale_y,
    )

    new_width = max(
        1,
        int(
            original_width
            * scale
        ),
    )

    new_height = max(
        1,
        int(
            original_height
            * scale
        ),
    )

    flag = flag.resize(
        (
            new_width,
            new_height,
        ),
        Image.Resampling.LANCZOS,
    )

    canvas = Image.new(
        "RGBA",
        (
            FLAG_WIDTH,
            FLAG_HEIGHT,
        ),
        (0, 0, 0, 0),
    )

    x = (
        FLAG_WIDTH
        - new_width
    ) // 2

    y = (
        FLAG_HEIGHT
        - new_height
    ) // 2

    canvas.alpha_composite(
        flag,
        (x, y),
    )

    border_draw = ImageDraw.Draw(
        canvas
    )

    border_draw.rectangle(
        (
            0,
            0,
            FLAG_WIDTH - 1,
            FLAG_HEIGHT - 1,
        ),
        outline=FLAG_BORDER,
        width=FLAG_BORDER_WIDTH,
    )

    return canvas


# ---------------------------------------------------------
# Draw flag
# ---------------------------------------------------------

def draw_flag(
    image,
    iso,
    country,
    center_lon,
    center_lat,
):

    # -----------------------------------------------------
    # If flag does not exist, draw NOTHING.
    # -----------------------------------------------------

    flag = load_flag(iso)

    if flag is None:
        return

    flag = prepare_flag(flag)

    if flag is None:
        return

    northernmost = get_northernmost_point(
        country,
        center_lon,
        center_lat,
    )

    if northernmost is None:

        print(
            f"[FLAG] No visible "
            f"northern point for {iso}"
        )

        return

    _, _, point_x, point_y = (
        northernmost
    )

    manual_x, manual_y = (
        FLAG_MANUAL_OFFSETS.get(
            iso,
            (0, 0),
        )
    )

    flag_x = (
        point_x
        - FLAG_WIDTH / 2
        + manual_x
    )

    flag_y = (
        point_y
        - FLAG_HEIGHT
        - FLAG_OFFSET
        + manual_y
    )

    # Keep flag inside canvas horizontally.
    flag_x = max(
        0,
        min(
            WIDTH - FLAG_WIDTH,
            flag_x,
        ),
    )

    # Keep flag inside canvas vertically.
    flag_y = max(
        0,
        min(
            HEIGHT - FLAG_HEIGHT,
            flag_y,
        ),
    )

    # -----------------------------------------------------
    # Connector line
    # -----------------------------------------------------

    flag_center_x = (
        flag_x
        + FLAG_WIDTH / 2
    )

    flag_bottom_y = (
        flag_y
        + FLAG_HEIGHT
    )

    connector_layer = Image.new(
        "RGBA",
        (
            WIDTH,
            HEIGHT,
        ),
        (0, 0, 0, 0),
    )

    connector_draw = ImageDraw.Draw(
        connector_layer
    )

    connector_draw.line(
        (
            point_x,
            point_y,
            flag_center_x,
            flag_bottom_y,
        ),
        fill=(255, 255, 255, 190),
        width=2,
    )

    image.alpha_composite(
        connector_layer
    )

    # -----------------------------------------------------
    # Draw flag
    # -----------------------------------------------------

    image.alpha_composite(
        flag,
        (
            int(flag_x),
            int(flag_y),
        ),
    )


# ---------------------------------------------------------
# Load watermark font
# ---------------------------------------------------------

def load_watermark_font():

    possible_fonts = [
        Path("C:/Windows/Fonts/arial.ttf"),
        Path("C:/Windows/Fonts/segoeui.ttf"),
        Path("C:/Windows/Fonts/calibri.ttf"),
    ]

    for font_path in possible_fonts:

        if font_path.is_file():

            try:

                return ImageFont.truetype(
                    str(font_path),
                    WATERMARK_FONT_SIZE,
                )

            except Exception:
                pass

    return ImageFont.load_default()


# ---------------------------------------------------------
# Draw watermark
# ---------------------------------------------------------

def draw_watermark(image):

    font = load_watermark_font()

    watermark_layer = Image.new(
        "RGBA",
        (
            WIDTH,
            HEIGHT,
        ),
        (0, 0, 0, 0),
    )

    watermark_draw = ImageDraw.Draw(
        watermark_layer
    )

    bbox = watermark_draw.textbbox(
        (0, 0),
        WATERMARK_TEXT,
        font=font,
    )

    text_width = (
        bbox[2] - bbox[0]
    )

    text_height = (
        bbox[3] - bbox[1]
    )

    x = (
        CX
        + RADIUS
        - WATERMARK_MARGIN
        - text_width
    )

    y = (
        CY
        + RADIUS
        - WATERMARK_MARGIN
        - text_height
    )

    # Small shadow for readability.
    watermark_draw.text(
        (
            x + 1,
            y + 1,
        ),
        WATERMARK_TEXT,
        font=font,
        fill=(0, 0, 0, 100),
    )

    # Main watermark.
    watermark_draw.text(
        (
            x,
            y,
        ),
        WATERMARK_TEXT,
        font=font,
        fill=WATERMARK_COLOR,
    )

    image.alpha_composite(
        watermark_layer
    )


# ---------------------------------------------------------
# Draw globe
# ---------------------------------------------------------

def draw_globe(
    countries,
    selected_iso,
):

    selected = countries[
        selected_iso
    ]

    center_lon, center_lat = (
        get_center(selected)
    )

    image = Image.new(
        "RGBA",
        (
            WIDTH,
            HEIGHT,
        ),
        BACKGROUND,
    )

    draw = ImageDraw.Draw(
        image
    )

    # -----------------------------------------------------
    # Ocean
    # -----------------------------------------------------

    draw.ellipse(
        (
            CX - RADIUS,
            CY - RADIUS,
            CX + RADIUS,
            CY + RADIUS,
        ),
        fill=OCEAN,
    )

    # -----------------------------------------------------
    # Countries
    # -----------------------------------------------------

    for iso, country in countries.items():

        selected_country = (
            iso == selected_iso
        )

        if selected_country:

            fill = HIGHLIGHT
            outline = SELECTED_BORDER
            line_width = 5

        else:

            fill = LAND
            outline = BORDER
            line_width = 1

        for ring in country["rings"]:

            projected = []

            for longitude, latitude in ring:

                x, y, visible = project(
                    longitude,
                    latitude,
                    center_lon,
                    center_lat,
                )

                projected.append(
                    (
                        x,
                        y,
                        visible,
                    )
                )

            segments = []
            current = []

            for x, y, visible in projected:

                if visible:

                    current.append(
                        (
                            x,
                            y,
                        )
                    )

                else:

                    if len(current) >= 3:

                        segments.append(
                            current
                        )

                    current = []

            if len(current) >= 3:

                segments.append(
                    current
                )

            for points in segments:

                if len(points) < 3:
                    continue

                draw.polygon(
                    points,
                    fill=fill,
                )

                draw.line(
                    points + [points[0]],
                    fill=outline,
                    width=line_width,
                    joint="curve",
                )

    # -----------------------------------------------------
    # Globe border
    # -----------------------------------------------------

    draw.ellipse(
        (
            CX - RADIUS,
            CY - RADIUS,
            CX + RADIUS,
            CY + RADIUS,
        ),
        outline=GLOBE_BORDER,
        width=2,
    )

    # -----------------------------------------------------
    # Subtle globe highlight
    # -----------------------------------------------------

    highlight = Image.new(
        "RGBA",
        (
            WIDTH,
            HEIGHT,
        ),
        (0, 0, 0, 0),
    )

    highlight_draw = ImageDraw.Draw(
        highlight
    )

    highlight_draw.ellipse(
        (
            CX - RADIUS + 20,
            CY - RADIUS + 20,
            CX + RADIUS - 20,
            CY + RADIUS - 20,
        ),
        outline=(255, 255, 255, 20),
        width=12,
    )

    highlight = highlight.filter(
        ImageFilter.GaussianBlur(8)
    )

    image = Image.alpha_composite(
        image,
        highlight,
    )

    # -----------------------------------------------------
    # Selected country's flag
    # -----------------------------------------------------

    draw_flag(
        image,
        selected_iso,
        selected,
        center_lon,
        center_lat,
    )

    # -----------------------------------------------------
    # Watermark
    # -----------------------------------------------------

    draw_watermark(
        image
    )

    return image.convert("RGBA")


# ---------------------------------------------------------
# Main
# ---------------------------------------------------------

def main():

    print("=" * 60)

    print(
        "CrossWorld Country Globe Generator"
    )

    print("=" * 60)

    print()

    print(
        f"Input : {INPUT_DIR}"
    )

    print(
        f"Output: {OUTPUT_DIR}"
    )

    print(
        f"Flags : {FLAGS_DIR}"
    )

    print()

    # -----------------------------------------------------
    # Create output directory
    # -----------------------------------------------------

    OUTPUT_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    # -----------------------------------------------------
    # Find CWB files
    # -----------------------------------------------------

    files = sorted(
        INPUT_DIR.glob("*.cwb")
    )

    if not files:

        raise RuntimeError(
            "No .cwb files found in:\n"
            f"{INPUT_DIR}"
        )

    print(
        f"Found {len(files)} CWB files."
    )

    # -----------------------------------------------------
    # Decode countries
    # -----------------------------------------------------

    countries = {}

    for file in files:

        iso = file.stem.upper()

        try:

            data = file.read_bytes()

            countries[iso] = decode_cwb(
                data
            )

        except Exception as error:

            print(
                f"[ERROR] {iso}: {error}"
            )

    print(
        f"Decoded {len(countries)} countries."
    )

    print()

    # -----------------------------------------------------
    # Generate images
    # -----------------------------------------------------

    total = len(countries)

    generated = 0
    skipped = 0

    for index, iso in enumerate(
        countries.keys(),
        start=1,
    ):

        # =================================================
        # IMPORTANT:
        #
        # If the flag does not exist:
        # - do NOT call draw_globe()
        # - do NOT create an image
        # - do NOT save a WebP
        #
        # The country is completely skipped.
        # =================================================

        flag_path = (
            FLAGS_DIR
            / f"{iso}.png"
        )

        if not flag_path.is_file():

            print(
                f"[SKIP] {iso}: "
                f"flag not found -> "
                f"image will NOT be generated."
            )

            skipped += 1

            continue

        # -------------------------------------------------
        # Generate image
        # -------------------------------------------------

        try:

            print(
                f"[{index}/{total}] "
                f"Generating {iso}..."
            )

            image = draw_globe(
                countries,
                iso,
            )

            output = (
                OUTPUT_DIR
                / f"{iso}.webp"
            )

            image.save(
                output,
                "WEBP",
                quality=88,
                method=6,
            )

            generated += 1

        except Exception as error:

            print(
                f"[ERROR] Failed {iso}: "
                f"{error}"
            )

    print()

    print("=" * 60)

    print(
        "Done!"
    )

    print(
        f"Generated: {generated}"
    )

    print(
        f"Skipped:   {skipped}"
    )

    print(
        f"Output folder:\n{OUTPUT_DIR}"
    )

    print("=" * 60)


if __name__ == "__main__":
    main()