"""Invoke esbuild to transpile a user ``.tsx`` file into a single ESM bundle.

Each bundle is written to an ephemeral temp directory created once per process.
Bundles are regenerated on each ``serve()`` call.

See Also:
    ``_esbuild.get_esbuild_binary`` — resolves the esbuild executable.
    ``_scanner.scan_and_register`` — orchestrates bundling for all discovered files.
"""

from __future__ import annotations

import subprocess
import tempfile
from pathlib import Path

from pixie_sdk._components._esbuild import get_esbuild_binary

# ============================================================================
# Output Directory
# ============================================================================

#: Ephemeral directory for transpiled bundles — created once at module import.
_bundle_dir = Path(tempfile.mkdtemp(prefix="pixie-sdk-components-"))


# ============================================================================
# Exceptions
# ============================================================================


class ComponentBundleError(Exception):
    """Raised when esbuild fails to transpile a user component.

    The full esbuild stderr output is included in the message so the user
    can see exactly which line of their component failed.
    """


# ============================================================================
# Public Interface
# ============================================================================


def bundle_component(src: Path, slot: str) -> Path:
    """Bundle a single ``.tsx`` component file into an ESM JavaScript module.

    The output file is written to ``<_bundle_dir>/<slot>.js``.

    Args:
        src: Absolute path to the user's ``.tsx`` source file.
        slot: Component slot name (used as the output filename stem).

    Returns:
        Absolute path to the generated ``.js`` bundle.

    Raises:
        ComponentBundleError: If esbuild exits with a non-zero return code.
    """
    esbuild = get_esbuild_binary()
    out = _bundle_dir / f"{slot}.js"

    cmd = [
        str(esbuild),
        str(src),
        "--bundle",
        "--format=esm",
        f"--outfile={out}",
        "--jsx=automatic",
        "--external:react",
        "--external:react-dom",
        "--external:react/jsx-runtime",
        f"--loader:{src.suffix}={src.suffix.lstrip('.')}",
        "--minify",
        "--sourcemap=inline",
        "--log-level=error",
    ]

    result = subprocess.run(cmd, capture_output=True, text=True)

    if result.returncode != 0:
        raise ComponentBundleError(
            f"Failed to bundle component for slot '{slot}':\n{result.stderr}"
        )

    return out


def get_bundle_dir() -> Path:
    """Return the ephemeral bundle output directory.

    Primarily exposed for tests.

    Returns:
        The ``Path`` of the temp directory where bundles are written.
    """
    return _bundle_dir
