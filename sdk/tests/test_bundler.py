"""Tests for pixie_sdk._components._bundler — esbuild invocation."""

from __future__ import annotations

from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from pixie_sdk._components._bundler import (
    ComponentBundleError,
    bundle_component,
    get_bundle_dir,
)


class TestBundleComponent:
    """Test bundle_component()."""

    @patch("pixie_sdk._components._bundler.get_esbuild_binary")
    @patch("pixie_sdk._components._bundler.subprocess.run")
    def test_success(self, mock_run, mock_esbuild, tmp_path):
        """A successful esbuild run returns the output path."""
        fake_esbuild = tmp_path / "esbuild"
        fake_esbuild.write_text("fake")
        mock_esbuild.return_value = fake_esbuild

        mock_run.return_value = MagicMock(returncode=0, stderr="", stdout="")

        src = tmp_path / "demo.tsx"
        src.write_text("export default function Demo() { return <div/>; }")

        result = bundle_component(src, "demo")
        assert result.name == "demo.js"
        mock_run.assert_called_once()

        # Verify the command includes key flags.
        cmd = mock_run.call_args[0][0]
        assert "--bundle" in cmd
        assert "--format=esm" in cmd
        assert "--jsx=automatic" in cmd

    @patch("pixie_sdk._components._bundler.get_esbuild_binary")
    @patch("pixie_sdk._components._bundler.subprocess.run")
    def test_failure_raises(self, mock_run, mock_esbuild, tmp_path):
        """A non-zero exit code raises ComponentBundleError."""
        fake_esbuild = tmp_path / "esbuild"
        fake_esbuild.write_text("fake")
        mock_esbuild.return_value = fake_esbuild

        mock_run.return_value = MagicMock(
            returncode=1,
            stderr="error: Expected ';' at line 3",
            stdout="",
        )

        src = tmp_path / "bad.tsx"
        src.write_text("invalid syntax {{{")

        with pytest.raises(ComponentBundleError, match="Expected ';'"):
            bundle_component(src, "bad")

    @patch("pixie_sdk._components._bundler.get_esbuild_binary")
    @patch("pixie_sdk._components._bundler.subprocess.run")
    def test_external_react(self, mock_run, mock_esbuild, tmp_path):
        """The command should mark react as external."""
        fake_esbuild = tmp_path / "esbuild"
        fake_esbuild.write_text("fake")
        mock_esbuild.return_value = fake_esbuild
        mock_run.return_value = MagicMock(returncode=0, stderr="", stdout="")

        src = tmp_path / "comp.tsx"
        src.write_text("export default function C() {}")

        bundle_component(src, "comp")

        cmd = mock_run.call_args[0][0]
        assert "--external:react" in cmd
        assert "--external:react-dom" in cmd
        assert "--external:react/jsx-runtime" in cmd


class TestGetBundleDir:
    """Test get_bundle_dir()."""

    def test_returns_path(self):
        """get_bundle_dir() returns a Path that exists."""
        d = get_bundle_dir()
        assert isinstance(d, Path)
        assert d.exists()


class TestComponentBundleError:
    """Test the custom exception."""

    def test_is_exception(self):
        """ComponentBundleError is an Exception."""
        assert issubclass(ComponentBundleError, Exception)

    def test_message(self):
        """The error message is preserved."""
        err = ComponentBundleError("build failed")
        assert str(err) == "build failed"
