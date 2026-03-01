"""Locate, download, cache, and return the path to an esbuild binary.

Works with no Node, no npm, and no internet after first run.
The binary is cached at ``~/.cache/pixie-sdk/esbuild/<version>/<platform>/esbuild``.

Environment variable override:
    Set ``PIXIE_ESBUILD_PATH`` to the absolute path of a pre-installed esbuild
    binary to skip all download logic.

See Also:
    ``_bundler.bundle_component`` — uses the binary returned by this module.
"""

from __future__ import annotations

import io
import os
import platform
import stat
import subprocess
import tarfile
from pathlib import Path

# ============================================================================
# Constants
# ============================================================================

ESBUILD_VERSION = "0.20.2"

#: Maps ``(platform.system().lower(), platform.machine().lower())``
#: to ``(os_slug, arch_slug)`` matching the ``@esbuild`` npm package names.
PLATFORM_MAP: dict[tuple[str, str], tuple[str, str]] = {
    ("linux", "x86_64"): ("linux", "x64"),
    ("linux", "aarch64"): ("linux", "arm64"),
    ("linux", "armv7l"): ("linux", "arm"),
    ("darwin", "x86_64"): ("darwin", "x64"),
    ("darwin", "arm64"): ("darwin", "arm64"),
    ("windows", "amd64"): ("win32", "x64"),
    ("windows", "arm64"): ("win32", "arm64"),
}

#: Environment variable that, when set, overrides all download logic.
ENV_OVERRIDE = "PIXIE_ESBUILD_PATH"

# Module-level cache so we skip disk checks after first resolution.
_cached_path: Path | None = None


# ============================================================================
# Helpers
# ============================================================================


def _get_cache_dir() -> Path:
    """Return the platform-appropriate cache directory.

    Uses ``platformdirs`` if available, otherwise falls back to
    ``~/.cache``.

    Returns:
        Absolute path to ``<cache_root>/pixie-sdk/esbuild/<version>``.
    """
    try:
        import platformdirs

        base = Path(platformdirs.user_cache_dir("pixie-sdk"))
    except ImportError:
        base = Path.home() / ".cache" / "pixie-sdk"

    return base / "esbuild" / ESBUILD_VERSION


def _resolve_platform() -> tuple[str, str]:
    """Determine the OS and architecture slugs for the current platform.

    Returns:
        A ``(os_slug, arch_slug)`` tuple.

    Raises:
        RuntimeError: If the current platform is not in ``PLATFORM_MAP``.
    """
    key = (platform.system().lower(), platform.machine().lower())
    result = PLATFORM_MAP.get(key)
    if result is None:
        raise RuntimeError(
            f"Unsupported platform: {key}. "
            f"Set {ENV_OVERRIDE} to the path of a manually installed esbuild binary."
        )
    return result


def _download_esbuild(os_slug: str, arch_slug: str, dest: Path) -> None:
    """Download the esbuild binary from the npm registry and write it to *dest*.

    Uses only ``urllib.request`` (stdlib) — no npm or npx required.

    Args:
        os_slug: e.g. ``"linux"``, ``"darwin"``, ``"win32"``.
        arch_slug: e.g. ``"x64"``, ``"arm64"``.
        dest: Absolute path where the binary will be written.

    Raises:
        RuntimeError: On network or extraction failure.
    """
    import urllib.request

    url = (
        f"https://registry.npmjs.org/@esbuild/{os_slug}-{arch_slug}/-/"
        f"{os_slug}-{arch_slug}-{ESBUILD_VERSION}.tgz"
    )

    # Determine the member path inside the tarball.
    if os_slug == "win32":
        member_path = "package/esbuild.exe"
    else:
        member_path = "package/bin/esbuild"

    try:
        with urllib.request.urlopen(url) as resp:
            data = resp.read()
    except Exception as exc:
        raise RuntimeError(
            f"Failed to download esbuild from {url}. "
            f"Check your internet connection or set {ENV_OVERRIDE}."
        ) from exc

    # Extract the binary from the tarball.
    buf = io.BytesIO(data)
    try:
        with tarfile.open(fileobj=buf, mode="r:gz") as tf:
            member = tf.getmember(member_path)
            extracted = tf.extractfile(member)
            if extracted is None:
                raise RuntimeError(f"Could not extract {member_path} from tarball.")
            binary_bytes = extracted.read()
    except (KeyError, tarfile.TarError) as exc:
        raise RuntimeError(f"Failed to extract esbuild from tarball: {exc}") from exc

    # Write to cache directory.
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(binary_bytes)

    # Make executable on non-Windows.
    if os_slug != "win32":
        current_mode = dest.stat().st_mode
        dest.chmod(current_mode | stat.S_IEXEC | stat.S_IXGRP | stat.S_IXOTH)


def _verify_binary(path: Path) -> None:
    """Run ``esbuild --version`` to ensure the binary is functional.

    Args:
        path: Path to the esbuild binary.

    Raises:
        RuntimeError: If the binary fails to execute.
    """
    try:
        subprocess.run(
            [str(path), "--version"],
            check=True,
            capture_output=True,
            text=True,
        )
    except (subprocess.CalledProcessError, OSError) as exc:
        raise RuntimeError(
            f"esbuild binary at {path} failed verification: {exc}"
        ) from exc


# ============================================================================
# Public Interface
# ============================================================================


def get_esbuild_binary() -> Path:
    """Return the path to a working esbuild binary for the current platform.

    Resolution order:
    1. Module-level in-memory cache (fastest — avoids disk access).
    2. ``PIXIE_ESBUILD_PATH`` environment variable.
    3. On-disk cache at ``~/.cache/pixie-sdk/esbuild/<version>/<platform>/esbuild``.
    4. Download from the npm registry, verify, and cache.

    Returns:
        Absolute ``Path`` to the esbuild executable.

    Raises:
        FileNotFoundError: If ``PIXIE_ESBUILD_PATH`` is set but the file
            does not exist.
        RuntimeError: On unsupported platform, network failure, or corrupt
            download.
    """
    global _cached_path

    # 1. In-memory cache.
    if _cached_path is not None:
        return _cached_path

    # 2. Environment override.
    env_path = os.environ.get(ENV_OVERRIDE)
    if env_path:
        p = Path(env_path)
        if not p.exists():
            raise FileNotFoundError(f"{ENV_OVERRIDE} set but not found: {p}")
        _cached_path = p
        return p

    # 3. Resolve platform.
    os_slug, arch_slug = _resolve_platform()

    exe_name = "esbuild.exe" if os_slug == "win32" else "esbuild"
    cache_dir = _get_cache_dir() / f"{os_slug}-{arch_slug}"
    cached = cache_dir / exe_name

    # 4. On-disk cache.
    if cached.exists():
        _cached_path = cached
        return cached

    # 5. Download.
    print(
        f"[pixie-sdk] Downloading esbuild {ESBUILD_VERSION} "
        f"for {os_slug}/{arch_slug}... (~7 MB, one-time)"
    )
    _download_esbuild(os_slug, arch_slug, cached)
    _verify_binary(cached)

    _cached_path = cached
    return cached


def reset_cache() -> None:
    """Clear the module-level cached path.

    Primarily used in tests to force re-resolution.
    """
    global _cached_path
    _cached_path = None
