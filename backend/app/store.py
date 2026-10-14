"""MongoDB storage. Lazy import allows pure/fake-backed tests without MongoDB."""
from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone
from hashlib import sha256

from .errors import AppError


class MongoStore:
    def __init__(self):
        from pymongo import MongoClient, ReturnDocument
        self.return_after = ReturnDocument.AFTER
        self.client = MongoClient(os.getenv("MONGODB_URI", "mongodb://localhost:27017"),
                                  serverSelectionTimeoutMS=5000, connectTimeoutMS=5000,
                                  socketTimeoutMS=10000, tz_aware=True)
        self.db = self.client[os.getenv("MONGODB_DATABASE", "climate_hazard")]
        self.client.admin.command("ping")
        # _id is already unique and indexed. TTL indexes only handle eventual cleanup.
        for name in ("weather_chunks", "analyses", "rate_limits"):
            self.db[name].create_index("expires_at", expireAfterSeconds=0)

    def ping(self) -> bool:
        return self.client.admin.command("ping").get("ok") == 1

    def close(self) -> None:
        self.client.close()

    def get(self, collection: str, key: str) -> dict | None:
        # TTL deletion is asynchronous; expiry must also be checked on reads.
        record = self.db[collection].find_one({
            "_id": key, "expires_at": {"$gt": datetime.now(timezone.utc)}
        })
        return record["payload"] if record else None

    def put(self, collection: str, key: str, payload: dict, days: int) -> None:
        now = datetime.now(timezone.utc)
        self.db[collection].replace_one({"_id": key}, {
            "_id": key, "created_at": now, "expires_at": now + timedelta(days=days),
            "payload": payload,
        }, upsert=True)

    def take_limit(self, scope: str, identity: str, limit: int, seconds: int) -> None:
        from pymongo.errors import DuplicateKeyError
        now = datetime.now(timezone.utc)
        bucket = int(now.timestamp()) // seconds
        key = sha256(f"{scope}:{identity}:{bucket}".encode()).hexdigest()
        update = {"$inc": {"count": 1}, "$setOnInsert": {
            "expires_at": now + timedelta(seconds=seconds + 120)
        }}
        try:
            record = self.db.rate_limits.find_one_and_update(
                {"_id": key}, update, upsert=True, return_document=self.return_after)
        except DuplicateKeyError:
            record = self.db.rate_limits.find_one_and_update(
                {"_id": key}, {"$inc": {"count": 1}}, return_document=self.return_after)
        if record["count"] > limit:
            remaining = seconds - int(now.timestamp()) % seconds
            raise AppError("Request limit reached. Please wait before retrying.", 429, remaining)
