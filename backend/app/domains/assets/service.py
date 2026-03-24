from dateutil.relativedelta import relativedelta
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import NotFoundError
from app.models.asset import Asset
from app.models.asset_field_value import AssetFieldValue
from app.models.asset_cost_history import AssetCostHistory
from app.models.asset_payment import AssetPayment
from app.models.asset_notification_setting import AssetNotificationSetting
from app.models.renewal_period import RenewalPeriod
from app.models.user import User
from app.domains.assets import schemas
from app.domains.settings.service import get_setting_value
from app.core.audit import log_audit
from app.core.storage import get_storage
from app.config import settings


async def _get_asset_query(db: AsyncSession, asset_id: int) -> Asset:
    result = await db.execute(
        select(Asset).options(selectinload(Asset.field_values)).where(Asset.id == asset_id)
    )
    asset = result.scalar_one_or_none()
    if asset is None:
        raise NotFoundError("Asset", asset_id)
    return asset


SORTABLE_COLUMNS = {
    "name": Asset.name,
    "type_id": Asset.type_id,
    "organization_id": Asset.organization_id,
    "project_id": Asset.project_id,
    "cost": Asset.cost,
    "purchase_date": Asset.purchase_date,
    "next_payment_date": Asset.next_payment_date,
}


async def get_assets(
    db: AsyncSession,
    offset: int = 0,
    limit: int = 20,
    is_archived: bool = False,
    search: str | None = None,
    type_id: int | None = None,
    organization_id: int | None = None,
    project_id: int | None = None,
    currency_id: int | None = None,
    sort_by: str | None = None,
    sort_order: str | None = None,
) -> list[Asset]:
    query = (
        select(Asset)
        .options(selectinload(Asset.field_values))
        .where(Asset.is_archived == is_archived)
    )
    if search:
        query = query.where(
            Asset.name.ilike(f"%{search}%") | Asset.comment.ilike(f"%{search}%")
        )
    if type_id:
        query = query.where(Asset.type_id == type_id)
    if organization_id:
        query = query.where(Asset.organization_id == organization_id)
    if project_id:
        query = query.where(Asset.project_id == project_id)
    if currency_id:
        query = query.where(Asset.currency_id == currency_id)

    col = SORTABLE_COLUMNS.get(sort_by) if sort_by else None
    if col is not None:
        query = query.order_by(col.desc() if sort_order == "desc" else col.asc())
    else:
        query = query.order_by(Asset.id.desc())

    result = await db.execute(query.offset(offset).limit(limit))
    return list(result.scalars().all())


async def get_asset(db: AsyncSession, asset_id: int) -> Asset:
    return await _get_asset_query(db, asset_id)


async def create_asset(db: AsyncSession, data: schemas.AssetCreate, user: User) -> Asset:
    field_values_data = data.field_values
    asset_data = data.model_dump(exclude={"field_values"})
    asset = Asset(**asset_data)
    db.add(asset)
    await db.flush()

    for fv in field_values_data:
        db.add(AssetFieldValue(asset_id=asset.id, field_id=fv.field_id, value=fv.value))

    # Create default notification settings
    default_days = await get_setting_value(db, "notification_days_before_payment", default=14)
    if isinstance(default_days, list):
        for d in default_days:
            db.add(AssetNotificationSetting(asset_id=asset.id, days_before=int(d)))
    elif isinstance(default_days, (int, float)):
        db.add(AssetNotificationSetting(asset_id=asset.id, days_before=int(default_days)))

    audit_data = {k: v.isoformat() if hasattr(v, "isoformat") else v for k, v in asset_data.items()}
    await log_audit(db, user, "create", "asset", asset.id, new_values=audit_data)
    await db.commit()
    return await _get_asset_query(db, asset.id)


async def update_asset(
    db: AsyncSession, asset_id: int, data: schemas.AssetUpdate, user: User
) -> Asset:
    asset = await _get_asset_query(db, asset_id)
    update_data = data.model_dump(exclude_unset=True)

    # Capture old values for audit
    old_values = {k: getattr(asset, k, None) for k in update_data}
    # Convert non-JSON-serializable types
    for k, v in old_values.items():
        if hasattr(v, "as_tuple"):
            old_values[k] = float(v)
        elif hasattr(v, "isoformat"):
            old_values[k] = v.isoformat()
    # Convert dates in update_data too
    audit_new = {}
    for k, v in update_data.items():
        if hasattr(v, "isoformat"):
            audit_new[k] = v.isoformat()
        else:
            audit_new[k] = v

    # Track cost/currency changes
    cost_changed = "cost" in update_data and update_data["cost"] != float(asset.cost)
    currency_changed = "currency_id" in update_data and update_data["currency_id"] != asset.currency_id
    if cost_changed or currency_changed:
        new_currency = update_data.get("currency_id", asset.currency_id)
        db.add(
            AssetCostHistory(
                asset_id=asset.id,
                old_value=float(asset.cost),
                new_value=update_data.get("cost", float(asset.cost)),
                currency_id=new_currency,
                old_currency_id=asset.currency_id if currency_changed else None,
                changed_by=user.id,
            )
        )

    for field, value in update_data.items():
        setattr(asset, field, value)
    await log_audit(db, user, "update", "asset", asset_id, old_values=old_values, new_values=audit_new)
    await db.commit()
    return await _get_asset_query(db, asset_id)


async def archive_asset(db: AsyncSession, asset_id: int, user: User) -> Asset:
    asset = await _get_asset_query(db, asset_id)
    asset.is_archived = True
    await log_audit(db, user, "archive", "asset", asset_id)
    await db.commit()
    return await _get_asset_query(db, asset_id)


async def restore_asset(db: AsyncSession, asset_id: int, user: User) -> Asset:
    asset = await _get_asset_query(db, asset_id)
    asset.is_archived = False
    await log_audit(db, user, "restore", "asset", asset_id)
    await db.commit()
    return await _get_asset_query(db, asset_id)


async def delete_asset(db: AsyncSession, asset_id: int, user: User) -> None:
    asset = await _get_asset_query(db, asset_id)
    # Delete invoice files from storage
    result = await db.execute(
        select(AssetPayment).where(AssetPayment.asset_id == asset_id)
    )
    for payment in result.scalars().all():
        await _delete_invoice_file(payment.invoice_url)
    await log_audit(db, user, "delete", "asset", asset_id, old_values={"name": asset.name})
    await db.delete(asset)
    await db.commit()


# --- Field Values ---


async def update_field_values(
    db: AsyncSession, asset_id: int, data: list[schemas.AssetFieldValueWrite]
) -> list[AssetFieldValue]:
    await _get_asset_query(db, asset_id)  # ensure exists

    # Delete existing values
    result = await db.execute(select(AssetFieldValue).where(AssetFieldValue.asset_id == asset_id))
    for existing in result.scalars().all():
        await db.delete(existing)

    # Insert new values
    for fv in data:
        db.add(AssetFieldValue(asset_id=asset_id, field_id=fv.field_id, value=fv.value))
    await db.commit()

    result = await db.execute(select(AssetFieldValue).where(AssetFieldValue.asset_id == asset_id))
    return list(result.scalars().all())


# --- Cost History ---


async def get_cost_history(db: AsyncSession, asset_id: int) -> list[AssetCostHistory]:
    await _get_asset_query(db, asset_id)
    result = await db.execute(
        select(AssetCostHistory)
        .where(AssetCostHistory.asset_id == asset_id)
        .order_by(AssetCostHistory.changed_at.desc())
    )
    return list(result.scalars().all())


# --- Payments ---


async def get_payments(db: AsyncSession, asset_id: int) -> list[AssetPayment]:
    await _get_asset_query(db, asset_id)
    result = await db.execute(
        select(AssetPayment)
        .where(AssetPayment.asset_id == asset_id)
        .order_by(AssetPayment.date.desc())
    )
    return list(result.scalars().all())


async def create_payment(
    db: AsyncSession, asset_id: int, data: schemas.PaymentCreate, user: User
) -> AssetPayment:
    asset = await _get_asset_query(db, asset_id)
    payment = AssetPayment(
        asset_id=asset_id,
        date=data.date,
        amount=data.amount,
        currency_id=data.currency_id,
        comment=data.comment,
        created_by=user.id,
    )
    db.add(payment)

    # Update next_payment_date based on renewal_type
    if asset.renewal_type == "manual":
        # For manual renewal, use the date provided in the payment
        if data.next_payment_date:
            asset.next_payment_date = data.next_payment_date
    elif asset.renewal_period_id:
        # For fixed renewal, auto-calculate from period
        period_result = await db.execute(
            select(RenewalPeriod).where(RenewalPeriod.id == asset.renewal_period_id)
        )
        period = period_result.scalar_one_or_none()
        if period:
            asset.next_payment_date = data.date + relativedelta(months=period.months)

    await log_audit(db, user, "payment", "asset", asset_id, new_values={
        "amount": float(data.amount),
        "date": str(data.date),
    })
    await db.commit()
    await db.refresh(payment)
    return payment


async def update_payment(
    db: AsyncSession, payment_id: int, data: schemas.PaymentUpdate, user: User
) -> AssetPayment:
    result = await db.execute(select(AssetPayment).where(AssetPayment.id == payment_id))
    payment = result.scalar_one_or_none()
    if payment is None:
        raise NotFoundError("Payment", payment_id)
    old_values = {}
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        old_val = getattr(payment, field, None)
        if hasattr(old_val, "isoformat"):
            old_values[field] = old_val.isoformat()
        elif hasattr(old_val, "as_tuple"):
            old_values[field] = float(old_val)
        else:
            old_values[field] = old_val
        setattr(payment, field, value)
    audit_new = {k: v.isoformat() if hasattr(v, "isoformat") else v for k, v in update_data.items()}
    await log_audit(db, user, "update_payment", "asset", payment.asset_id,
                    old_values=old_values, new_values=audit_new)
    await db.commit()
    await db.refresh(payment)
    return payment


async def _delete_invoice_file(invoice_url: str | None) -> None:
    if invoice_url and settings.s3_enabled:
        try:
            storage = get_storage()
            await storage.delete(invoice_url)
        except Exception:
            pass


async def delete_payment(
    db: AsyncSession, payment_id: int, user: User
) -> None:
    result = await db.execute(select(AssetPayment).where(AssetPayment.id == payment_id))
    payment = result.scalar_one_or_none()
    if payment is None:
        raise NotFoundError("Payment", payment_id)
    await _delete_invoice_file(payment.invoice_url)
    await log_audit(db, user, "delete_payment", "asset", payment.asset_id,
                    old_values={"amount": float(payment.amount), "date": str(payment.date)})
    await db.delete(payment)
    await db.commit()


# --- Notification Settings ---


async def get_notification_settings(
    db: AsyncSession, asset_id: int
) -> list[AssetNotificationSetting]:
    await _get_asset_query(db, asset_id)
    result = await db.execute(
        select(AssetNotificationSetting)
        .where(AssetNotificationSetting.asset_id == asset_id)
        .order_by(AssetNotificationSetting.days_before.desc())
    )
    return list(result.scalars().all())


async def update_notification_settings(
    db: AsyncSession, asset_id: int, data: schemas.AssetNotificationSettingWrite
) -> list[AssetNotificationSetting]:
    await _get_asset_query(db, asset_id)

    # Delete existing
    result = await db.execute(
        select(AssetNotificationSetting).where(AssetNotificationSetting.asset_id == asset_id)
    )
    for existing in result.scalars().all():
        await db.delete(existing)

    # Insert new
    for days in data.days_before:
        db.add(AssetNotificationSetting(asset_id=asset_id, days_before=days))
    await db.commit()

    return await get_notification_settings(db, asset_id)
