"""Read only the requested UTC interval from CITIC's GOES L1b archive.

Network I/O and NetCDF/HDF5 work run off the asyncio loop. A process-wide lock
protects netCDF4, whose underlying C library is not thread safe. Archives are
streamed without extracting paths to disk. No NOAA rolling-series fallback is used.
"""

import asyncio
import io
import re
import tarfile
import tempfile
import threading
from datetime import UTC, datetime, timedelta
from typing import Any, BinaryIO, cast
from urllib.parse import unquote, urljoin, urlparse
from xml.etree import ElementTree

import httpx
import numpy as np
from netCDF4 import Dataset, num2date

from app.models.jobs import QueryGoesArchivePayload

BASE_URL = "https://nube.citic.ucr.ac.cr/public.php/dav/files/QT3SfLRSDyaDkEo/GOES/"
PRODUCT_PATHS = {
    "SFXR": "EXIS/SFXR",
    "SFEU": "EXIS/SFEU",
    "GEOF": "MAG/GEOF",
    "MPSH": "SEIS/MPSH",
    "SGPS": "SEIS/SGPS",
}
MAX_FILE_BYTES = 8 * 1024 * 1024
MAX_ARCHIVE_BYTES = 1024 * 1024 * 1024
MAX_FILES = 6000
MAX_POINTS = 360
NETCDF_LOCK = threading.Lock()
FILE_PATTERN = re.compile(
    r"^OR_(?:EXIS|MAG|SEIS)-L1b-([A-Z]+)_G(\d{2})_s(\d{14})_e(\d{14})_c\d{14}\.nc$"
)


def bounds(payload: QueryGoesArchivePayload) -> tuple[datetime, datetime]:
    if payload.start_time >= payload.end_time:
        raise ValueError("The start time must precede the end time")
    day = payload.date.isoformat()
    return (
        datetime.fromisoformat(f"{day}T{payload.start_time}:00+00:00"),
        datetime.fromisoformat(f"{day}T{payload.end_time}:00+00:00") + timedelta(minutes=1),
    )


def file_interval(name: str, product: str) -> tuple[datetime, datetime, int] | None:
    match = FILE_PATTERN.fullmatch(name)
    if not match or match[1] != product:
        return None

    def instant(value: str) -> datetime:
        return datetime.strptime(value[:-1], "%Y%j%H%M%S").replace(tzinfo=UTC) + timedelta(
            milliseconds=int(value[-1]) * 100
        )

    return instant(match[3]), instant(match[4]), int(match[2])


def overlaps(name: str, payload: QueryGoesArchivePayload) -> bool:
    interval = file_interval(name, payload.product)
    start, end = bounds(payload)
    return interval is not None and interval[0] < end and interval[1] >= start


def selected_variable(payload: QueryGoesArchivePayload) -> tuple[str, str, tuple[int, ...], str]:
    """Return data, quality flag, explicit trailing dimension indices, and units."""
    parameter = payload.parameter
    if payload.product == "SFXR" and parameter in ("0.05-0.4nm", "0.1-0.8nm"):
        return ("xrsa" if parameter == "0.05-0.4nm" else "xrsb", "quality_flags", (), "W m-2")
    if payload.product == "SFEU":
        if parameter == "mgii_index":
            return "avgRatioMgNoaa", "qualityFlags", (), "1"
        if parameter in ("1175", "1216", "1335", "1405", "256", "284", "304"):
            return f"avgIrradiance{parameter}", "qualityFlags", (), "W m-2"
    if payload.product == "GEOF":
        if parameter == "total":
            return "total_mag_ACRF", "DQF", (), "nT"
        if parameter in ("EPN-x", "EPN-y", "EPN-z"):
            return "amb_mag_EPN", "DQF", (("EPN-x", "EPN-y", "EPN-z").index(parameter),), "nT"
    if payload.product == "MPSH":
        match = re.fullmatch(r"(electron|proton):T([1-5]):E(\d{1,2})", parameter)
        if match and 1 <= int(match[3]) <= (10 if match[1] == "electron" else 11):
            species = "Electron" if match[1] == "electron" else "Proton"
            return (
                f"Diff{species}Fluxes",
                f"Diff{species}FluxDQFs",
                (int(match[2]) - 1, int(match[3]) - 1),
                "cm-2 sr-1 s-1 keV-1",
            )
    if payload.product == "SGPS":
        match = re.fullmatch(r"(minus|plus):(.+)", parameter)
        if match:
            sensor = 0 if match[1] == "minus" else 1
            if match[2] == "P11":
                return (
                    "T3P11_IntegralProtonFlux",
                    "T3P11_IntegralProtonFluxDQFs",
                    (sensor,),
                    "cm-2 sr-1 s-1",
                )
            for telescope, channels in enumerate(
                (
                    ("P1", "P2A", "P2B", "P3", "P4", "P5"),
                    ("P6", "P7"),
                    ("P8AF", "P8BF", "P8CF", "P9F", "P10"),
                ),
                1,
            ):
                if match[2] in channels:
                    return (
                        f"T{telescope}_DifferentialProtonFluxes",
                        f"T{telescope}_DifferentialProtonFluxDQFs",
                        (sensor, channels.index(match[2])),
                        "cm-2 sr-1 s-1 keV-1",
                    )
    raise ValueError("Unsupported historical product/parameter selection")


def read_netcdf(content: bytes, payload: QueryGoesArchivePayload) -> list[tuple[str, float, int]]:
    """Decode calibrated observations and CF time, rejecting fill and flagged values."""
    variable, quality_name, indices, unit = selected_variable(payload)
    start, end = bounds(payload)
    with NETCDF_LOCK, Dataset("goes.nc", memory=content) as dataset:
        satellite = int(str(dataset.platform_ID).removeprefix("G"))
        if not str(dataset.dataset_name).startswith(
            f"OR_{PRODUCT_PATHS[payload.product].split('/')[0]}-L1b-{payload.product}_"
        ):
            raise ValueError("Unexpected NetCDF product")
        time_name = "time"
        if payload.product == "SFXR":
            primary = dataset.variables[f"primary_{variable}"][:]
            first = dataset.variables[f"irradiance_{variable}1"]
            second = dataset.variables[f"irradiance_{variable}2"]
            if first.units != unit or second.units != unit:
                raise ValueError("Unexpected irradiance units")
            values = np.ma.where(primary == 0, first[:], second[:])
            values = np.ma.masked_where(~np.isin(primary, [0, 1]), values)
            values = np.ma.masked_where(dataset.variables["invalid_flags"][:] != 0, values)
        else:
            data = dataset.variables[variable]
            if data.units != unit:
                raise ValueError("Unexpected NetCDF units")
            values = data[(Ellipsis, *indices)] if indices else data[:]
        quality = dataset.variables[quality_name]
        flags = (
            quality[(Ellipsis, *indices)] if indices and payload.product != "GEOF" else quality[:]
        )
        # The first mask describes good quality. MAG may have a valid correction bit set.
        good_mask = int(np.asarray(quality.flag_masks).flat[0])
        values = np.ma.masked_where(np.bitwise_and(flags, good_mask) != 0, values)
        if payload.product == "GEOF":
            time_name = "OB_time"
        elif payload.product in ("MPSH", "SGPS"):
            time_name = "L1a_SciData_TimeStamp"
        time_variable = dataset.variables[time_name]
        times = time_variable[:, indices[0]] if payload.product == "SGPS" else time_variable[:]
        if times.shape != values.shape:
            raise ValueError("NetCDF time and value dimensions do not match")
        valid = ~(np.ma.getmaskarray(times) | np.ma.getmaskarray(values))
        valid &= np.isfinite(times) & np.isfinite(values)
        if payload.product != "GEOF":
            valid &= values >= 0
        decoded = num2date(
            times[valid],
            units=time_variable.units,
            calendar=getattr(time_variable, "calendar", "standard"),
            only_use_cftime_datetimes=False,
            only_use_python_datetimes=True,
        )
        return [
            (
                timestamp.replace(tzinfo=UTC).isoformat().replace("+00:00", "Z"),
                float(value),
                satellite,
            )
            for timestamp, value in zip(
                [decoded] if isinstance(decoded, datetime) else decoded, values[valid], strict=True
            )
            if start <= timestamp.replace(tzinfo=UTC) < end
        ]


def list_files(xml: bytes, directory: str) -> list[str]:
    if len(xml) > 16 * 1024 * 1024 or b"<!DOCTYPE" in xml.upper():
        raise ValueError("Invalid archive listing")
    root = ElementTree.fromstring(xml)
    if root.tag != "{DAV:}multistatus":
        raise ValueError("Unexpected archive listing")
    if not root.findall("{DAV:}response"):
        raise ValueError("Archive listing has no directory response")
    files = []
    for response in root.findall("{DAV:}response"):
        href = response.findtext("{DAV:}href", "")
        url = urljoin(directory, href)
        # Restrict fetches to direct children of this public share directory.
        if not url.startswith(directory):
            continue
        child = unquote(url[len(directory) :])
        successful = any(
            " 200 " in prop.findtext("{DAV:}status", "")
            for prop in response.findall("{DAV:}propstat")
        )
        if not successful:
            raise ValueError("Archive entry is not readable")
        if not child or "/" in child or "\\" in child or urlparse(url).query:
            continue
        if child.endswith(".nc"):
            files.append(url)
    if len(files) > MAX_FILES:
        raise ValueError("Archive day exceeds the file limit")
    return sorted(set(files))


async def fetch_bytes(client: httpx.AsyncClient, url: str, limit: int) -> bytes:
    data = bytearray()
    async with client.stream("GET", url) as response:
        response.raise_for_status()
        async for chunk in response.aiter_bytes():
            data.extend(chunk)
            if len(data) > limit:
                raise ValueError("Archive file exceeds the size limit")
    return bytes(data)


def read_tar(
    content: bytes | BinaryIO, payload: QueryGoesArchivePayload
) -> list[tuple[str, float, int]]:
    readings: list[tuple[str, float, int]] = []
    expanded = 0
    with tarfile.open(
        fileobj=io.BytesIO(content) if isinstance(content, bytes) else content, mode="r|gz"
    ) as archive:
        for count, member in enumerate(archive, 1):
            expanded += member.size
            if count > MAX_FILES * 2 or expanded > 4 * MAX_ARCHIVE_BYTES:
                raise ValueError("Expanded archive exceeds limits")
            name = member.name.rsplit("/", 1)[-1]
            if not member.isfile() or not overlaps(name, payload):
                continue
            if member.size > MAX_FILE_BYTES:
                raise ValueError("NetCDF member exceeds the size limit")
            stream = archive.extractfile(member)
            if stream is None:
                raise ValueError("Unreadable NetCDF archive member")
            with stream:
                readings.extend(read_netcdf(stream.read(MAX_FILE_BYTES + 1), payload))
    return readings


async def run(payload: QueryGoesArchivePayload, job: Any) -> dict[str, Any]:
    async with asyncio.timeout(30 * 60):
        return await _run(payload, job)


async def _run(payload: QueryGoesArchivePayload, job: Any) -> dict[str, Any]:
    bounds(payload)
    selected_variable(payload)
    day_url = f"{BASE_URL}{PRODUCT_PATHS[payload.product]}/{payload.date:%Y%m%d}"
    readings: list[tuple[str, float, int]] = []
    async with httpx.AsyncClient(timeout=120, follow_redirects=False) as client:
        response = await client.request("PROPFIND", f"{day_url}/", headers={"Depth": "1"})
        await job.updateProgress(5)
        if response.status_code == 404:
            # Older days are stored as tar.gz instead of expanded directories.
            archive_response = await client.head(f"{day_url}.tar.gz")
            if archive_response.status_code != 404:
                archive_response.raise_for_status()
                # Keep compressed days off the heap; temporary files are closed on all paths.
                with tempfile.TemporaryFile() as spool:
                    downloaded = 0
                    async with client.stream("GET", f"{day_url}.tar.gz") as download:
                        download.raise_for_status()
                        async for chunk in download.aiter_bytes():
                            downloaded += len(chunk)
                            if downloaded > MAX_ARCHIVE_BYTES:
                                raise ValueError("Archive exceeds the size limit")
                            await asyncio.to_thread(spool.write, chunk)
                    spool.seek(0)
                    readings = await asyncio.to_thread(read_tar, cast(BinaryIO, spool), payload)
        else:
            response.raise_for_status()
            urls = [
                url
                for url in list_files(response.content, f"{day_url}/")
                if overlaps(unquote(url.rsplit("/", 1)[-1]), payload)
            ]
            # Bound simultaneous downloads and keep HDF5 calls off the event loop.
            for offset in range(0, len(urls), 4):
                contents = await asyncio.gather(
                    *(fetch_bytes(client, url, MAX_FILE_BYTES) for url in urls[offset : offset + 4])
                )
                for content in contents:
                    readings.extend(await asyncio.to_thread(read_netcdf, content, payload))
                await job.updateProgress(5 + round(90 * min(offset + 4, len(urls)) / len(urls)))
    result = build_result(payload, readings)
    await job.updateProgress(100)
    return result


def build_result(
    payload: QueryGoesArchivePayload, readings: list[tuple[str, float, int]]
) -> dict[str, Any]:
    satellites = sorted({reading[2] for reading in readings})
    # Never silently combine observations made by different satellites.
    if len(satellites) > 1:
        raise ValueError("The archive interval contains more than one GOES satellite")
    unique = sorted(set(readings), key=lambda reading: datetime.fromisoformat(reading[0]))
    if len({point[0] for point in unique}) != len(unique):
        raise ValueError("Conflicting observations at the same timestamp")
    sampled = len(unique) > MAX_POINTS
    if sampled:
        unique = [
            unique[round(index * (len(unique) - 1) / (MAX_POINTS - 1))]
            for index in range(MAX_POINTS)
        ]
    return {
        "query": payload.model_dump(mode="json", by_alias=True),
        "points": [{"timestamp": timestamp, "value": value} for timestamp, value, _ in unique],
        "satellite": satellites[0] if satellites else None,
        "sampled": sampled,
    }
