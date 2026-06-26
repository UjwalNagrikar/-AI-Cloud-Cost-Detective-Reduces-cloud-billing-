"""
AI-powered cost analysis for Azure resources.
Identifies cost optimization opportunities in scanned resources.
"""
from typing import Any


def analyze_costs(resources: list[dict[str, Any]]) -> dict[str, Any]:
    """
    Analyze scanned Azure resources and return cost optimization recommendations.
    
    Args:
        resources: List of resource dictionaries from azure_scanner.scan_resource_group()
        
    Returns:
        dict with 'issues' list and 'estimated_savings' dict
    """
    issues = []
    total_monthly_savings = 0.0
    
    for resource in resources:
        resource_type = resource.get("type", "")
        name = resource.get("name", "unknown")
        resource_group = resource.get("resource_group", "")
        fix_command = resource.get("fix_command", "")
        
        # ── Unattached Managed Disks ──
        if resource_type == "Microsoft.Compute/disks":
            disk_state = resource.get("properties", {}).get("diskState", "")
            if disk_state != "Attached":
                issues.append({
                    "resource_name": name,
                    "resource_type": resource_type,
                    "resource_group": resource_group,
                    "issue": "Unattached managed disk incurring costs",
                    "suggestion": "Delete this disk or attach it to a VM to avoid unnecessary charges",
                    "severity": "high",
                    "estimated_monthly_savings": "Varies ($5-50/month depending on size and tier)",
                    "fix_command": fix_command,
                })
        
        # ── Unassociated Public IPs ──
        elif resource_type == "Microsoft.Network/publicIPAddresses":
            ip_config = resource.get("properties", {}).get("ipConfiguration")
            if not ip_config:
                monthly_saving = 3.65
                total_monthly_savings += monthly_saving
                issues.append({
                    "resource_name": name,
                    "resource_type": resource_type,
                    "resource_group": resource_group,
                    "issue": "Unassociated public IP address",
                    "suggestion": "Delete unused public IP to stop incurring charges (~$3.65/month)",
                    "severity": "medium",
                    "estimated_monthly_savings": f"${monthly_saving:.2f}/month",
                    "fix_command": fix_command,
                })
        
        # ── Deallocated VMs ──
        elif resource_type == "Microsoft.Compute/virtualMachines":
            power_state = resource.get("properties", {}).get("powerState", "")
            if "deallocated" in str(power_state).lower():
                issues.append({
                    "resource_name": name,
                    "resource_type": resource_type,
                    "resource_group": resource_group,
                    "issue": "VM is deallocated but attached disks still incur costs",
                    "suggestion": "Consider deleting the VM and its disks if no longer needed, or use Azure Reserved Instances",
                    "severity": "medium",
                    "estimated_monthly_savings": "Depends on attached disk sizes",
                    "fix_command": fix_command,
                })
        
        # ── Premium Storage (potentially overprovisioned) ──
        elif resource_type == "Microsoft.Storage/storageAccounts":
            sku = resource.get("sku", {})
            if isinstance(sku, dict):
                sku_name = sku.get("name", "")
            else:
                sku_name = str(sku)
            
            if "Premium" in sku_name:
                issues.append({
                    "resource_name": name,
                    "resource_type": resource_type,
                    "resource_group": resource_group,
                    "issue": "Premium storage tier may be overprovisioned",
                    "suggestion": "Evaluate if Standard tier would meet your performance needs for cost reduction",
                    "severity": "low",
                    "estimated_monthly_savings": "40-60% reduction in storage costs",
                    "fix_command": fix_command,
                })
        
        # ── Empty or Unused Resource Groups ──
        # This would need group-level analysis, handled differently
    
    total_yearly_savings = total_monthly_savings * 12
    
    return {
        "issues": issues,
        "estimated_savings": {
            "monthly": round(total_monthly_savings, 2),
            "yearly": round(total_yearly_savings, 2),
            "currency": "USD",
        },
    }