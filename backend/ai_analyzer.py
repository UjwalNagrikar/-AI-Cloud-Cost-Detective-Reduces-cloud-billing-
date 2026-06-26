import json
import os
from typing import Any

from openai import (
    OpenAI,
    APIConnectionError,
    APITimeoutError,
    APIStatusError,
    RateLimitError,
)

SYSTEM_PROMPT = """
You are an expert Azure FinOps engineer.

Analyze Azure resources for cloud cost optimization.

Return ONLY valid JSON:

{
  "summary":"...",
  "issues":[
    {
      "resource_name":"...",
      "issue_type":"...",
      "severity":"high|medium|low",
      "explanation":"...",
      "estimated_savings":"...",
      "fix_command":"..."
    }
  ],
  "estimated_savings":"..."
}
"""


def get_client() -> OpenAI:
    provider = os.getenv("AI_PROVIDER", "groq").lower()

    if provider == "groq":
        return OpenAI(
            api_key=os.getenv("GROQ_API_KEY"),
            base_url="https://api.groq.com/openai/v1",
        )

    return OpenAI(
        api_key=os.getenv("OPENAI_API_KEY"),
    )


MODEL = os.getenv("AI_MODEL", "llama-3.3-70b-versatile")


def fallback(reason: str) -> dict[str, Any]:
    return {
        "summary": f"AI analysis unavailable ({reason})",
        "issues": [],
        "estimated_savings": "Unknown",
    }


def normalize(payload: dict[str, Any]) -> dict[str, Any]:

    issues = []

    for issue in payload.get("issues", []):

        if not isinstance(issue, dict):
            continue

        severity = issue.get("severity", "low").lower()

        if severity not in ["high", "medium", "low"]:
            severity = "low"

        issues.append(
            {
                "resource_name": issue.get(
                    "resource_name",
                    "Unknown Resource",
                ),
                "issue_type": issue.get(
                    "issue_type",
                    "other",
                ),
                "severity": severity,
                "explanation": issue.get(
                    "explanation",
                    "No explanation.",
                ),
                "estimated_savings": issue.get(
                    "estimated_savings",
                    "Unknown",
                ),
                "fix_command": issue.get(
                    "fix_command",
                    "az resource list",
                ),
            }
        )

    return {
        "summary": payload.get(
            "summary",
            "Analysis completed.",
        ),
        "issues": issues,
        "estimated_savings": payload.get(
            "estimated_savings",
            "Unknown",
        ),
    }


def analyze_costs(resources: list[dict[str, Any]]) -> dict[str, Any]:

    client = get_client()

    prompt = {
        "task": "Analyze Azure resources for cost optimization.",
        "checks": [
            "unused resources",
            "over provisioning",
            "wrong pricing tier",
            "idle resources",
            "recommend Azure CLI fixes",
        ],
        "resources": resources,
    }

    try:

        response = client.chat.completions.create(
            model=MODEL,
            temperature=0.2,
            response_format={"type": "json_object"},
            messages=[
                {
                    "role": "system",
                    "content": SYSTEM_PROMPT,
                },
                {
                    "role": "user",
                    "content": json.dumps(prompt, default=str),
                },
            ],
        )

        content = response.choices[0].message.content or "{}"

        return normalize(json.loads(content))

    except RateLimitError:
        return fallback("Quota exceeded")

    except APITimeoutError:
        return fallback("Timeout")

    except APIConnectionError:
        return fallback("Connection error")

    except APIStatusError as e:
        return fallback(f"API Error {e.status_code}")

    except json.JSONDecodeError:
        return fallback("Invalid JSON returned")

    except Exception as e:
        return fallback(str(e))