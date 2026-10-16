"""
Prometheus metrics for Secure Environment Manager.
Counters are defined here to avoid duplicate registration.
"""
from prometheus_client import Counter

# Custom counters for business logic
LOGIN_SUCCESS_COUNTER = Counter("sem_login_success_total", "Total successful logins")
LOGIN_FAILURE_COUNTER = Counter("sem_login_failure_total", "Total failed login attempts", ["reason"])
SECRET_UPDATE_COUNTER = Counter("sem_secret_updates_total", "Total secret modifications", ["namespace", "environment"])
SECRET_ACCESS_COUNTER = Counter("sem_secret_access_total", "Total secret reads/exports", ["namespace", "environment"])