import json
import os
from typing import Any

from openai import OpenAI


SYSTEM_PROMPT = """You are an expert Azure FinOps engineer.
Analyze Azure resource inventory for cloud cost optimization.
Return only valid JSON with this shape:
{
  "summary": "short executive summary",
  "issues": [
    {
      "resource_name": "name",
      "issue_type": "over-provisioned | unused | misconfigured | wrong pricing tier | other",
      "severity": "high | medium | low",
      "explanation": "why this is a cost concern",
      "estimated_savings": "monthly savings estimate or unknown",
      "fix_command": "Azure CLI command to fix or inspect further"
    }
  ],
  "estimated_savings": "overall monthly savings estimate"
}
Prefer concrete Azure CLI commands. If evidence is insufficient, recommend safe inspection commands.
"""


def _coerce_analysis(payload: dict[str, Any]) -> dict[str, Any]:
    issues = payload.get("issues")
    if not isinstance(issues, list):
        issues = []

    normalized_issues = []
    for issue in issues:
        if not isinstance(issue, dict):
            continue
        severity = str(issue.get("severity", "low")).lower()
        if severity not in {"high", "medium", "low"}:
            severity = "low"

        normalized_issues.append(
            {
                "resource_name": issue.get("resource_name") or "Unknown resource",
                "issue_type": issue.get("issue_type") or "other",
                "severity": severity,
                "explanation": issue.get("explanation") or "No explanation provided.",
                "estimated_savings": issue.get("estimated_savings") or "Unknown",
                "fix_command": issue.get("fix_command") or "az resource show --name <name>",
            }
        )

    return {
        "summary": payload.get("summary") or "Analysis completed.",
        "issues": normalized_issues,
        "estimated_savings": payload.get("estimated_savings") or "Unknown",
    }


def analyze_costs(resources: list[dict[str, Any]]) -> dict[str, Any]:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is not configured.")

    client = OpenAI(api_key=api_key)
    user_prompt = {
        "task": "Analyze these Azure resources for cost optimization opportunities.",
        "checks": [
            "over-provisioning",
            "unused or idle resources",
            "misconfigurations",
            "wrong pricing tiers",
            "actionable Azure CLI fixes",
        ],
        "resources": resources,
    }

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": json.dumps(user_prompt, default=str)},
        ],
        response_format={"type": "json_object"},
        temperature=0.2,
    )

    content = response.choices[0].message.content or "{}"
    return _coerce_analysis(json.loads(content))
