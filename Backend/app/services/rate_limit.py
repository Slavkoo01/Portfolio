"""
Simple in-memory rate limiter (per-key sliding window).

Good enough for a single-process personal portfolio. It stores recent hit
timestamps per key (e.g. an IP hash) in memory. NOTE: state is per-process and
resets on restart — if you later run multiple workers or deploy, switch to a
Redis-backed limiter (Flask-Limiter). The interface here stays the same.
"""
from __future__ import annotations

import threading
import time
from collections import defaultdict, deque

from app.errors.exceptions import RateLimitError


class InMemoryRateLimiter:
    def __init__(self):
        self._hits: dict[str, deque] = defaultdict(deque)
        self._lock = threading.Lock()

    def check(self, key: str, *, limit: int, window_seconds: int) -> None:
        """Raise RateLimitError if `key` exceeded `limit` hits in the window."""
        now = time.time()
        cutoff = now - window_seconds
        with self._lock:
            dq = self._hits[key]
            # Drop timestamps older than the window.
            while dq and dq[0] < cutoff:
                dq.popleft()
            if len(dq) >= limit:
                retry_after = int(dq[0] + window_seconds - now) + 1
                raise RateLimitError(
                    f"Too many requests. Try again in {retry_after}s.",
                    code="RATE_LIMITED",
                )
            dq.append(now)


# Module-level singleton shared across requests in this process.
rate_limiter = InMemoryRateLimiter()
