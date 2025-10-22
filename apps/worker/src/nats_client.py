"""
NATS JetStream client utilities for persistent pub/sub messaging
"""

import json
from typing import Any

import nats
from nats.aio.client import Client as NATSClient
from nats.js import JetStreamContext


class NATSManager:
    """Manages NATS JetStream connection and publishing operations"""

    def __init__(self, url: str = "nats://localhost:4222"):
        self.url = url
        self.nc: NATSClient | None = None
        self.js: JetStreamContext | None = None

    async def connect(self):
        """Connect to NATS server and initialize JetStream"""
        if self.nc and self.nc.is_connected:
            return self.nc

        self.nc = await nats.connect(self.url)
        self.js = self.nc.jetstream()
        print(f"[NATS] Connected to {self.url} with JetStream")
        return self.nc

    async def disconnect(self):
        """Disconnect from NATS server"""
        if self.nc and self.nc.is_connected:
            await self.nc.drain()
            print("[NATS] Disconnected")

    async def ensure_stream(self, stream_name: str, subjects: list[str]):
        """Ensure a JetStream stream exists"""
        if not self.js:
            await self.connect()

        try:
            await self.js.stream_info(stream_name)
            print(f"[NATS] Stream '{stream_name}' already exists")
        except:
            # Stream doesn't exist, create it
            await self.js.add_stream(
                name=stream_name,
                subjects=subjects,
            )
            print(f"[NATS] Created stream '{stream_name}' for subjects: {subjects}")

    async def publish(self, subject: str, data: dict[str, Any]):
        """Publish a message to JetStream"""
        if not self.js:
            await self.connect()

        payload = json.dumps(data, default=str).encode()  # default=str handles UUID
        ack = await self.js.publish(subject, payload)
        print(f"[NATS] Published to {subject}: {data} (seq: {ack.seq})")
        return ack
