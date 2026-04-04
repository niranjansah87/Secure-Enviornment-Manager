# health_service.py
import os
import shutil
import logging
import psutil
from pathlib import Path
from datetime import datetime, timezone
from cryptography.fernet import Fernet
from typing import Dict, Any

logger = logging.getLogger(__name__)

class HealthService:
    def __init__(self, data_dir: str = "data"):
        self.data_dir = Path(data_dir)

    def get_system_health(self) -> Dict[str, Any]:
        """Performs a battery of health checks."""
        health = {
            "status": "healthy",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "checks": {
                "encryption": {"status": "ok", "message": "Key is valid"},
                "storage": {"status": "ok", "message": "Disk space sufficient"},
                "process": {"status": "ok", "message": "Backend responding"},
                "folders": {"status": "ok", "message": "Data directory exists"}
            }
        }
        
        # 1. Encryption Key Check
        try:
            key = os.getenv("ENCRYPTION_KEY")
            if not key:
                health["checks"]["encryption"]["status"] = "error"
                health["checks"]["encryption"]["message"] = "Key missing from environment"
                health["status"] = "degraded"
            else:
                f = Fernet(key.encode())
                test_val = f.encrypt(b"health_check")
                f.decrypt(test_val) # Verify it decrypts back
        except Exception as e:
            health["checks"]["encryption"]["status"] = "error"
            health["checks"]["encryption"]["message"] = f"Key invalid: {str(e)}"
            health["status"] = "degraded"
            
        # 2. Storage Check
        try:
            total, used, free = shutil.disk_usage(self.data_dir)
            health["checks"]["storage"]["details"] = {
                "total_gb": round(total / (2**30), 2),
                "used_gb": round(used / (2**30), 2),
                "free_gb": round(free / (2**30), 2),
                "percent_used": round((used / total) * 100, 1)
            }
            if health["checks"]["storage"]["details"]["percent_used"] > 90:
                health["checks"]["storage"]["status"] = "warning"
                health["checks"]["storage"]["message"] = "Disk space critically low"
                if health["status"] == "healthy": health["status"] = "degraded"
        except Exception as e:
            health["checks"]["storage"]["status"] = "error"
            health["checks"]["storage"]["message"] = f"Storage check failed: {str(e)}"
            
        # 3. Process Check (Basics)
        try:
            proc = psutil.Process(os.getpid())
            health["checks"]["process"]["details"] = {
                "cpu_percent": proc.cpu_percent(),
                "memory_mb": round(proc.memory_info().rss / (2**20), 2),
                "uptime_seconds": round(datetime.now().timestamp() - proc.create_time(), 0)
            }
        except Exception:
            pass
            
        # 4. Folder structure check
        if not self.data_dir.exists():
            health["checks"]["folders"]["status"] = "error"
            health["checks"]["folders"]["message"] = "Data directory missing"
            health["status"] = "error"
            
        return health

health_service = HealthService()
