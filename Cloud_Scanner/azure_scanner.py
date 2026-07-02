import json
import shutil
import subprocess
from pathlib import Path
from typing import Any


class AzureCliError(Exception):
    def __init__(self, message: str, status_code: int = 500):
        super().__init__(message)
        self.status_code = status_code


def _find_az() -> str:
    """
    Locate Azure CLI executable on Windows/Linux/macOS.
    Raises AzureCliError if not found.
    """
    candidates = [
        shutil.which("az"),
        shutil.which("az.cmd"),
        r"C:\Program Files\Microsoft SDKs\Azure\CLI2\wbin\az.cmd",
        r"C:\Program Files (x86)\Microsoft SDKs\Azure\CLI2\wbin\az.cmd",
    ]

    for candidate in candidates:
        if candidate and Path(candidate).exists():
            return candidate

    raise AzureCliError(
        "Azure CLI is not installed or cannot be found. "
        "Install it from https://aka.ms/installazurecli and run 'az login'.",
        status_code=503,
    )


# ── Lazy singleton: resolved only on first actual CLI call ─────────────────────
_AZ_EXECUTABLE: str | None = None


def _get_az() -> str:
    """Return the cached Azure CLI path, resolving it lazily on first call."""
    global _AZ_EXECUTABLE
    if _AZ_EXECUTABLE is None:
        _AZ_EXECUTABLE = _find_az()
    return _AZ_EXECUTABLE


def _run_az(command: list[str]) -> Any:
    """
    Execute an Azure CLI command and return parsed JSON output.
    The first element must be 'az'; it is replaced with the resolved executable.
    """
    az = _get_az()
    if command and command[0].lower() == "az":
        command = [az, *command[1:]]

    try:
        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
            timeout=120,
        )
    except subprocess.TimeoutExpired as exc:
        raise AzureCliError("Azure CLI command timed out.", status_code=504) from exc
    except FileNotFoundError as exc:
        raise AzureCliError(
            f"Azure CLI executable not found: {az}", status_code=503
        ) from exc

    if result.returncode != 0:
        error = (
            result.stderr.strip()
            or result.stdout.strip()
            or "Unknown Azure CLI error."
        )
        raise AzureCliError(error)

    try:
        return json.loads(result.stdout)
    except json.JSONDecodeError as exc:
        raise AzureCliError("Azure CLI returned invalid JSON.") from exc


# ── Public API ─────────────────────────────────────────────────────────────────

def list_resource_groups() -> list[dict[str, str | None]]:
    """Return a list of Azure resource groups (name + location)."""
    groups = _run_az(["az", "group", "list", "--output", "json"])
    return [
        {
            "name": group.get("name"),
            "location": group.get("location"),
        }
        for group in groups
        if group.get("name")
    ]


def scan_resource_group(resource_group: str) -> list[dict[str, Any]]:
    """
    List all resources inside *resource_group* and return normalised dicts.

    Each dict contains at minimum:
        name, type, location, resource_group, sku, kind, tags, properties
    """
    resources = _run_az(
        [
            "az", "resource", "list",
            "--resource-group", resource_group,
            "--output", "json",
        ]
    )

    if not isinstance(resources, list):
        raise AzureCliError(
            f"Unexpected response while scanning resource group '{resource_group}'."
        )

    normalised: list[dict[str, Any]] = []
    for res in resources:
        if not isinstance(res, dict):
            continue
        normalised.append(
            {
                "name": res.get("name") or "unknown",
                "type": res.get("type") or "unknown",
                "location": res.get("location") or "unknown",
                "resource_group": res.get("resourceGroup") or resource_group,
                "sku": res.get("sku"),          # may be None
                "kind": res.get("kind"),        # may be None
                "tags": res.get("tags") or {},
                "properties": res.get("properties") or {},
            }
        )

    return normalised