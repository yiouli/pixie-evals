"""Tests for pixie_sdk._components._esbuild — binary resolution and download."""

from __future__ import annotations

import os
from unittest.mock import patch

import pytest

from pixie_sdk._components._esbuild import (
    ENV_OVERRIDE,
    ESBUILD_VERSION,
    PLATFORM_MAP,
    _resolve_platform,
    get_esbuild_binary,
    reset_cache,
)


@pytest.fixture(autouse=True)
def _reset():
    """Reset module-level cache before each test."""
    reset_cache()
    yield
    reset_cache()


class TestResolvePlatform:
    """Test _resolve_platform()."""

    @patch("pixie_sdk._components._esbuild.platform")
    def test_linux_x64(self, mock_platform):
        """Linux x86_64 maps to ('linux', 'x64')."""
        mock_platform.system.return_value = "Linux"
        mock_platform.machine.return_value = "x86_64"
        assert _resolve_platform() == ("linux", "x64")

    @patch("pixie_sdk._components._esbuild.platform")
    def test_darwin_arm64(self, mock_platform):
        """macOS arm64 maps to ('darwin', 'arm64')."""
        mock_platform.system.return_value = "Darwin"
        mock_platform.machine.return_value = "arm64"
        assert _resolve_platform() == ("darwin", "arm64")

    @patch("pixie_sdk._components._esbuild.platform")
    def test_unsupported_raises(self, mock_platform):
        """Unknown platform raises RuntimeError."""
        mock_platform.system.return_value = "UnknownOS"
        mock_platform.machine.return_value = "unknownarch"
        with pytest.raises(RuntimeError, match="Unsupported platform"):
            _resolve_platform()


class TestGetEsbuildBinary:
    """Test get_esbuild_binary()."""

    def test_env_override_existing(self, tmp_path):
        """If PIXIE_ESBUILD_PATH points to a real file, return it."""
        fake = tmp_path / "esbuild"
        fake.write_text("fake")
        with patch.dict(os.environ, {ENV_OVERRIDE: str(fake)}):
            assert get_esbuild_binary() == fake

    def test_env_override_missing(self, tmp_path):
        """If PIXIE_ESBUILD_PATH points to a missing file, raise."""
        with patch.dict(os.environ, {ENV_OVERRIDE: "/nonexistent/esbuild"}):
            with pytest.raises(FileNotFoundError, match=ENV_OVERRIDE):
                get_esbuild_binary()

    def test_uses_cached_on_disk(self, tmp_path):
        """If the binary already exists in cache, skip download."""
        # Set up a fake cached binary.
        fake = tmp_path / "esbuild"
        fake.write_text("fake")

        with (
            patch.dict(os.environ, {}, clear=False),
            patch(
                "pixie_sdk._components._esbuild._resolve_platform",
                return_value=("linux", "x64"),
            ),
            patch(
                "pixie_sdk._components._esbuild._get_cache_dir",
                return_value=tmp_path,
            ),
        ):
            # Remove env override if present.
            os.environ.pop(ENV_OVERRIDE, None)

            # Create the cached file at the expected location.
            cache_path = tmp_path / "linux-x64" / "esbuild"
            cache_path.parent.mkdir(parents=True, exist_ok=True)
            cache_path.write_text("cached")

            result = get_esbuild_binary()
            assert result == cache_path

    @patch("pixie_sdk._components._esbuild._verify_binary")
    @patch("pixie_sdk._components._esbuild._download_esbuild")
    def test_downloads_when_not_cached(self, mock_download, mock_verify, tmp_path):
        """If no cached binary exists, download and verify."""
        with (
            patch.dict(os.environ, {}, clear=False),
            patch(
                "pixie_sdk._components._esbuild._resolve_platform",
                return_value=("linux", "x64"),
            ),
            patch(
                "pixie_sdk._components._esbuild._get_cache_dir",
                return_value=tmp_path,
            ),
        ):
            os.environ.pop(ENV_OVERRIDE, None)

            # Make the download write a file so the path exists for caching.
            cache_path = tmp_path / "linux-x64" / "esbuild"

            def fake_download(os_slug, arch_slug, dest):
                dest.parent.mkdir(parents=True, exist_ok=True)
                dest.write_text("binary")

            mock_download.side_effect = fake_download

            result = get_esbuild_binary()
            assert result == cache_path
            mock_download.assert_called_once_with("linux", "x64", cache_path)
            mock_verify.assert_called_once_with(cache_path)

    def test_in_memory_cache(self, tmp_path):
        """Second call returns immediately from in-memory cache."""
        fake = tmp_path / "esbuild"
        fake.write_text("fake")

        with patch.dict(os.environ, {ENV_OVERRIDE: str(fake)}):
            first = get_esbuild_binary()
            second = get_esbuild_binary()
            assert first == second


class TestPlatformMap:
    """Test PLATFORM_MAP coverage."""

    def test_all_entries_are_tuples(self):
        """Every value in PLATFORM_MAP is a 2-tuple of strings."""
        for key, value in PLATFORM_MAP.items():
            assert isinstance(key, tuple) and len(key) == 2
            assert isinstance(value, tuple) and len(value) == 2
            assert all(isinstance(s, str) for s in key)
            assert all(isinstance(s, str) for s in value)

    def test_version_is_string(self):
        """ESBUILD_VERSION is a non-empty string."""
        assert isinstance(ESBUILD_VERSION, str)
        assert len(ESBUILD_VERSION) > 0
