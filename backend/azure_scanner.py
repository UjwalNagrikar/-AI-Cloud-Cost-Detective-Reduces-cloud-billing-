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
        "Azure CLI is not installed or cannot be found. Install Azure CLI and run 'az login'.",
        status_code=503,
    )


AZ_EXECUTABLE = _find_az()


def _run_az(command: list[str]) -> Any:
    """
    Execute Azure CLI and return parsed JSON.
    """

    if command and command[0].lower() == "az":
        command[0] = AZ_EXECUTABLE

    try:
        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
            timeout=120,
        )

    except subprocess.TimeoutExpired as exc:
        raise AzureCliError(
            "Azure CLI command timed out.",
            status_code=504,
        ) from exc

    except FileNotFoundError as exc:
        raise AzureCliError(
            f"Azure CLI executable not found: {AZ_EXECUTABLE}",
            status_code=503,
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
        raise AzureCliError(
            "Azure CLI returned invalid JSON."
        ) from exc


def list_resource_groups() -> list[dict[str, str | None]]:
    groups = _run_az(
        [
            "az",
            "group",
            "list",
            "--output",
            "json",
        ]
    )

    return [
        {
            "name": group.get("name"),
            "location": group.get("location"),
        }
        for group in groups
        if group.get("name")
    ]