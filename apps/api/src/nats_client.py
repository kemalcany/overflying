"""
NATS JetStream client utilities for persistent pub/sub messaging
"""

import asyncio
import json
from collections.abc import Callable
from typing import Any

import nats
from nats.aio.client import Client as NATSClient
from nats.js import JetStreamContext


class NATSManager:
    """Manages NATS JetStream connection and pub/sub operations"""

    def __init__(self, url: str = "nats://localhost:4222"):
        self.url = url
        self.nc: NATSClient | None = None
        self.js: JetStreamContext | None = None

    async def connect(self, max_retries: int = 5, retry_delay: float = 2.0):
        """Connect to NATS server and initialize JetStream with retries"""
        if self.nc and self.nc.is_connected:
            return self.nc

        for attempt in range(max_retries):
            try:
                self.nc = await nats.connect(
                    self.url,
                    connect_timeout=5,
                    max_reconnect_attempts=3,
                )
                self.js = self.nc.jetstream()
                print(f"[NATS] Connected to {self.url} with JetStream")
                return self.nc
            except Exception as e:
                if attempt < max_retries - 1:
                    print(
                        f"[NATS] Connection attempt {attempt + 1}/{max_retries} failed: {e}"
                    )
                    print(f"[NATS] Retrying in {retry_delay} seconds...")
                    await asyncio.sleep(retry_delay)
                else:
                    print(f"[NATS] Failed to connect after {max_retries} attempts: {e}")
                    print(
                        "[NATS] API will continue without NATS. Start NATS and restart API."
                    )
                    raise

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

        payload = json.dumps(data).encode()
        ack = await self.js.publish(subject, payload)
        print(f"[NATS] Published to {subject}: {data} (seq: {ack.seq})")
        return ack

    async def subscribe(
        self,
        stream_name: str,
        consumer_name: str,
        subjects: list[str],
        callback: Callable,
    ):
        """Subscribe to JetStream stream with durable consumer"""
        if not self.js:
            await self.connect()

        # Ensure stream exists
        await self.ensure_stream(stream_name, subjects)

        async def message_handler(msg):
            try:
                data = json.loads(msg.data.decode())
                await callback(data)
                await msg.ack()
            except Exception as e:
                print(f"[NATS] Error processing message: {e}")
                await msg.nak()

        # Create pull-based consumer
        psub = await self.js.pull_subscribe_bind(
            durable=consumer_name,
            stream=stream_name,
        )
        print(f"[NATS] Subscribed to stream '{stream_name}' as '{consumer_name}'")
        return psub

    async def create_consumer(
        self,
        stream_name: str,
        consumer_name: str,
        filter_subject: str | None = None,
    ):
        """Create a durable consumer if it doesn't exist"""
        if not self.js:
            await self.connect()

        try:
            await self.js.consumer_info(stream_name, consumer_name)
            print(f"[NATS] Consumer '{consumer_name}' already exists")
        except:
            config = {"durable_name": consumer_name}
            if filter_subject:
                config["filter_subject"] = filter_subject

            await self.js.add_consumer(stream_name, **config)
            print(
                f"[NATS] Created consumer '{consumer_name}' on stream '{stream_name}'"
            )

    async def purge_stream(self, stream_name: str):
        """Purge all messages from a stream"""
        await self.js.purge_stream(stream_name)
        print(f"[NATS] Purged stream: {stream_name}")
