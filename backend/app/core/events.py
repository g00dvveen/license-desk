import logging

logger = logging.getLogger(__name__)


async def publish_event(topic: str, event: dict) -> None:
    """Publish a domain event. Currently logs only; Kafka integration planned."""
    logger.info("Event topic=%s payload=%s", topic, event)


async def close_event_producer() -> None:
    """No-op stub for future Kafka teardown."""
