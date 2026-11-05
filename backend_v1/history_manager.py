import json
import logging
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, List, Optional
from cryptography.fernet import Fernet

logger = logging.getLogger(__name__)

class HistoryManager:
    """Manages version history for environment variables."""

    def __init__(self, data_dir: str, encryption_key: str):
        self.data_dir = Path(data_dir)
        self.fernet = Fernet(encryption_key.encode())

    def _get_history_file(self, namespace: str, environment: str) -> Path:
        """Get path to history file for a namespace/environment."""
        env_dir = self.data_dir / namespace
        env_dir.mkdir(parents=True, exist_ok=True)
        return env_dir / f"{environment}.history.jsonl"

    def _encrypt_data(self, data: Dict[str, str]) -> str:
        """Encrypt variable data for storage."""
        json_data = json.dumps(data)
        return self.fernet.encrypt(json_data.encode()).decode()

    def _decrypt_data(self, encrypted_data: str) -> Dict[str, str]:
        """Decrypt variable data from storage."""
        try:
            json_data = self.fernet.decrypt(encrypted_data.encode()).decode()
            return json.loads(json_data)
        except Exception as e:
            logger.error(f"Failed to decrypt history data: {e}")
            return {}

    def save_snapshot(
        self,
        namespace: str,
        environment: str,
        variables: Dict[str, str],
        user_id: str,
        action: str,
        description: str
    ) -> str:
        """Save a snapshot of the current state."""
        snapshot_id = str(uuid.uuid4())
        
        snapshot = {
            "id": snapshot_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "user_id": user_id,
            "action": action,
            "description": description,
            "variables": self._encrypt_data(variables)
        }

        history_file = self._get_history_file(namespace, environment)
        try:
            with open(history_file, "a", encoding="utf-8") as f:
                f.write(json.dumps(snapshot) + "\n")
            logger.info(f"Saved history snapshot {snapshot_id} for {namespace}/{environment}")
            return snapshot_id
        except Exception as e:
            logger.error(f"Failed to save history snapshot: {e}")
            return ""

    def get_history(self, namespace: str, environment: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Get list of history entries (without full variable data)."""
        history_file = self._get_history_file(namespace, environment)
        if not history_file.exists():
            return []

        history = []
        try:
            with open(history_file, "r", encoding="utf-8") as f:
                for line in f:
                    try:
                        entry = json.loads(line.strip())
                        # Remove heavy variable data for list view
                        entry.pop("variables", None)
                        history.append(entry)
                    except json.JSONDecodeError:
                        continue
            
            # Return most recent first
            return list(reversed(history))[:limit]
        except Exception as e:
            logger.error(f"Failed to read history: {e}")
            return []

    def get_snapshot(self, namespace: str, environment: str, snapshot_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific snapshot with full decrypted variables."""
        history_file = self._get_history_file(namespace, environment)
        if not history_file.exists():
            return None

        try:
            with open(history_file, "r", encoding="utf-8") as f:
                for line in f:
                    try:
                        entry = json.loads(line.strip())
                        if entry["id"] == snapshot_id:
                            # Decrypt variables on demand
                            entry["variables"] = self._decrypt_data(entry["variables"])
                            return entry
                    except json.JSONDecodeError:
                        continue
        except Exception as e:
            logger.error(f"Failed to read snapshot {snapshot_id}: {e}")
        
        return None
