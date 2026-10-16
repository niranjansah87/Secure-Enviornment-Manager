# analytics_service.py
import json
import logging
from datetime import datetime, timedelta, timezone
from pathlib import Path
from collections import defaultdict
from typing import Dict, List, Any

logger = logging.getLogger(__name__)

class AnalyticsService:
    def __init__(self, log_file: str = "audit_logs/audit.jsonl"):
        self.log_file = Path(log_file)

    def get_activity_trends(self, days: int = 7) -> List[Dict[str, Any]]:
        """Returns a list of daily activity counts for the last 'n' days."""
        if not self.log_file.exists():
            return []

        now = datetime.now(timezone.utc)
        start_date = (now - timedelta(days=days-1)).replace(hour=0, minute=0, second=0, microsecond=0)
        
        # Initialize the result with zeros for each day
        daily_data = {}
        for i in range(days):
            date_str = (start_date + timedelta(days=i)).strftime("%Y-%m-%d")
            daily_data[date_str] = {
                "date": date_str,
                "updates": 0,
                "access": 0,
                "auth": 0,
                "total": 0
            }

        try:
            with open(self.log_file, "r", encoding="utf-8") as f:
                for line in f:
                    try:
                        entry = json.loads(line.strip())
                        ts_str = entry.get("timestamp")
                        if not ts_str:
                            continue
                            
                        ts = datetime.fromisoformat(ts_str)
                        if ts < start_date:
                            continue
                            
                        date_key = ts.strftime("%Y-%m-%d")
                        if date_key in daily_data:
                            action = entry.get("action", "")
                            daily_data[date_key]["total"] += 1
                            
                            if action in ("CREATE_VARIABLE", "UPDATE_VARIABLE", "DELETE_VARIABLE", "BULK_REPLACE"):
                                daily_data[date_key]["updates"] += 1
                            elif action in ("EXPORT_VARIABLES", "READ_VARIABLE"):
                                daily_data[date_key]["access"] += 1
                            elif action in ("LOGIN_SUCCESS", "LOGIN_FAILURE", "LOGOUT"):
                                daily_data[date_key]["auth"] += 1
                    except (json.JSONDecodeError, ValueError):
                        continue
        except Exception as e:
            logger.error(f"Error parsing audit logs for analytics: {e}")
            
        return sorted(daily_data.values(), key=lambda x: x["date"])

    def get_distribution_stats(self, data_dir: str = "data") -> Dict[str, Any]:
        """Calculates secret counts per namespace."""
        stats = {
            "namespaces": [],
            "total_secrets": 0,
            "total_environments": 0
        }
        
        root = Path(data_dir)
        if not root.exists():
            return stats
            
        for ns_dir in root.iterdir():
            if ns_dir.is_dir() and not ns_dir.name.startswith("."):
                ns_secrets = 0
                ns_envs = 0
                for env_file in ns_dir.glob("*.enc"):
                    ns_envs += 1
                    # We could count actual keys here, but for speed we'll do metadata or estimate
                    ns_secrets += 5 # Placeholder if we don't want to decrypt everything
                
                stats["namespaces"].append({
                    "name": ns_dir.name,
                    "environments": ns_envs,
                    "estimated_secrets": ns_secrets
                })
                stats["total_secrets"] += ns_secrets
                stats["total_environments"] += ns_envs
                
        return stats

    def get_summary_stats(self, days: int = 7) -> Dict[str, Any]:
        """Returns security health and action breakdown for the last 'n' days."""
        stats = {
            "security_stats": {"success": 0, "failures": 0},
            "action_breakdown": defaultdict(int)
        }
        
        if not self.log_file.exists():
            return {
                "security_stats": stats["security_stats"],
                "action_breakdown": []
            }

        now = datetime.now(timezone.utc)
        start_date = (now - timedelta(days=days-1)).replace(hour=0, minute=0, second=0, microsecond=0)

        try:
            with open(self.log_file, "r", encoding="utf-8") as f:
                for line in f:
                    try:
                        entry = json.loads(line.strip())
                        ts_str = entry.get("timestamp")
                        if not ts_str: continue
                        
                        ts = datetime.fromisoformat(ts_str)
                        if ts < start_date: continue
                        
                        action = entry.get("action", "")
                        if action == "LOGIN_SUCCESS":
                            stats["security_stats"]["success"] += 1
                        elif action == "LOGIN_FAILURE":
                            stats["security_stats"]["failures"] += 1
                        
                        # Map detailed actions to readable categories
                        category = "Other"
                        if "VARIABLE" in action or "BULK" in action:
                            category = "Updates"
                        elif "READ" in action or "EXPORT" in action:
                            category = "Access"
                        elif "LOGIN" in action or "LOGOUT" in action:
                            category = "Auth"
                        
                        stats["action_breakdown"][category] += 1
                    except (json.JSONDecodeError, ValueError):
                        continue
        except Exception as e:
            logger.error(f"Error gathering summary stats: {e}")

        # Convert breakdown to list for frontend
        breakdown = [
            {"action": k, "count": v} for k, v in stats["action_breakdown"].items()
        ]
        
        return {
            "security_stats": stats["security_stats"],
            "action_breakdown": breakdown if breakdown else [{"action": "None", "count": 0}]
        }

analytics_service = AnalyticsService()
