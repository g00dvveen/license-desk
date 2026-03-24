import asyncio
from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import async_session_maker
from app.models.asset import Asset
from app.models.asset_notification_setting import AssetNotificationSetting
from app.models.notification import Notification
from app.models.system_setting import SystemSetting
from app.models.user_permission import UserPermission
from app.tasks.celery_app import celery_app


async def _get_default_days(db: AsyncSession) -> list[int]:
    result = await db.execute(
        select(SystemSetting).where(
            SystemSetting.key == "notification_days_before_payment"
        )
    )
    setting = result.scalar_one_or_none()
    if setting:
        val = setting.value
        if isinstance(val, list):
            return val
        if isinstance(val, (int, float)):
            return [int(val)]
    return [14]


async def _run_reminders() -> int:
    created = 0
    async with async_session_maker() as db:
        default_days = await _get_default_days(db)
        today = date.today()

        # Get all assets with next_payment_date set
        result = await db.execute(
            select(Asset).where(
                Asset.next_payment_date.isnot(None),
                Asset.is_archived.is_(False),
                Asset.notifications_enabled.is_(True),
            )
        )
        assets = list(result.scalars().all())

        for asset in assets:
            # Get asset-specific settings or use defaults
            setting_result = await db.execute(
                select(AssetNotificationSetting).where(
                    AssetNotificationSetting.asset_id == asset.id
                )
            )
            asset_settings = list(setting_result.scalars().all())
            days_list = [s.days_before for s in asset_settings] if asset_settings else default_days

            days_until = (asset.next_payment_date - today).days

            if days_until not in days_list:
                continue

            # Find users with access to this asset's organization
            perm_result = await db.execute(
                select(UserPermission.user_id).where(
                    UserPermission.organization_id.in_([asset.organization_id, None])
                )
            )
            user_ids = list(perm_result.scalars().all())

            for user_id in user_ids:
                notification = Notification(
                    user_id=user_id,
                    title=f"Payment reminder: {asset.name}",
                    message=f"Payment due in {days_until} days ({asset.next_payment_date})",
                    entity_type="asset",
                    entity_id=asset.id,
                )
                db.add(notification)
                created += 1

        await db.commit()
    return created


@celery_app.task(name="app.tasks.payment_reminder.send_payment_reminders")
def send_payment_reminders() -> int:
    return asyncio.run(_run_reminders())
