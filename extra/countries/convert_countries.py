from pathlib import Path
import struct
import shapefile


# -------------------------------------------------
# Paths
# -------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent

INPUT = (
    BASE_DIR
    / "ne_10m_admin_0_countries.shp"
)

OUTPUT_DIR = (
    BASE_DIR
    / "output"
)

OUTPUT_DIR.mkdir(
    parents=True,
    exist_ok=True,
)


# -------------------------------------------------
# Settings
# -------------------------------------------------

SCALE = 10000


# -------------------------------------------------
# Helpers
# -------------------------------------------------

def zigzag(value: int) -> int:
    return (value << 1) ^ (value >> 31)


def write_varuint(
    value: int,
) -> bytes:

    result = bytearray()

    value = zigzag(value)

    while value >= 0x80:
        result.append(
            (value & 0x7F) | 0x80
        )
        value >>= 7

    result.append(value)

    return bytes(result)


def encode_ring(
    points,
) -> bytes:

    output = bytearray()

    previous_x = 0
    previous_y = 0

    for longitude, latitude in points:

        x = round(
            longitude * SCALE
        )

        y = round(
            latitude * SCALE
        )

        dx = x - previous_x
        dy = y - previous_y

        output.extend(
            write_varuint(dx)
        )

        output.extend(
            write_varuint(dy)
        )

        previous_x = x
        previous_y = y

    return bytes(output)


# -------------------------------------------------
# Read ShapeFile
# -------------------------------------------------

print(
    "Reading:",
    INPUT,
)

reader = shapefile.Reader(
    str(INPUT)
)

fields = reader.fields[1:]

field_names = [
    field[0]
    for field in fields
]

print(
    "Fields:",
    field_names,
)


# -------------------------------------------------
# Find ISO field
# -------------------------------------------------

iso_field = None

for candidate in (
    "ADM0_A3",
    "ISO_A3",
    "SOV_A3",
):

    if candidate in field_names:
        iso_field = candidate
        break


if iso_field is None:
    raise RuntimeError(
        "Could not find ISO A3 field"
    )


iso_index = field_names.index(
    iso_field
)


# -------------------------------------------------
# Convert
# -------------------------------------------------

count = 0


for shape_record in reader.iterShapeRecords():

    record = shape_record.record
    shape = shape_record.shape

    iso_a3 = str(
        record[iso_index]
    ).strip().upper()


    if (
        not iso_a3
        or iso_a3 == "-99"
    ):
        continue


    points = shape.points
    parts = list(shape.parts)

    parts.append(
        len(points)
    )


    rings = []


    for i in range(
        len(parts) - 1
    ):

        start = parts[i]
        end = parts[i + 1]

        ring = points[
            start:end
        ]


        if len(ring) < 3:
            continue


        encoded = encode_ring(
            ring
        )

        rings.append(
            encoded
        )


    if not rings:
        continue


    # -------------------------------------------------
    # File
    # -------------------------------------------------

    output_file = (
        OUTPUT_DIR
        / f"{iso_a3}.bin"
    )


    with output_file.open(
        "wb"
    ) as f:

        # Magic
        f.write(
            b"CWB1"
        )

        # Version
        f.write(
            struct.pack(
                "<H",
                1,
            )
        )

        # Number of rings
        f.write(
            struct.pack(
                "<I",
                len(rings),
            )
        )


        for ring in rings:

            f.write(
                struct.pack(
                    "<I",
                    len(ring),
                )
            )

            f.write(
                ring
            )


    count += 1

    print(
        f"{iso_a3}: "
        f"{len(rings)} rings "
        f"-> {output_file.name}"
    )


print()
print(
    "Done."
)

print(
    "Countries:",
    count,
)

print(
    "Output:",
    OUTPUT_DIR,
)