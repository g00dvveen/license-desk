from celery import Celery
from celery.schedules import crontab

from app.config import settings

celery_app = Celery(
    "license_desk",
    broker=settings.redis_url,
    backend=settings.redis_url,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    beat_schedule={
        "payment-reminder": {
            "task": "app.tasks.payment_reminder.send_payment_reminders",
            "schedule": crontab(hour=8, minute=0),
        },
    },
)

celery_app.autodiscover_tasks(["app.tasks"])
