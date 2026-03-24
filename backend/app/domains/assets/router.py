from fastapi import APIRouter, Depends, Query, UploadFile, File, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db, get_current_user
from app.core.pagination import PaginationParams
from app.models.user import User
from app.config import settings
from app.models.asset_payment import AssetPayment
from app.core.storage import get_storage
from app.domains.assets import schemas, service

router = APIRouter()


@router.get("/storage-info")
async def storage_info():
    return {"s3_enabled": settings.s3_enabled}


@router.get("/", response_model=list[schemas.AssetRead])
async def list_assets(
    pagination: PaginationParams = Depends(),
    is_archived: bool = False,
    search: str | None = Query(None),
    type_id: int | None = Query(None),
    organization_id: int | None = Query(None),
    project_id: int | None = Query(None),
    currency_id: int | None = Query(None),
    sort_by: str | None = Query(None),
    sort_order: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    return await service.get_assets(
        db,
        offset=pagination.offset,
        limit=pagination.size,
        is_archived=is_archived,
        search=search,
        type_id=type_id,
        organization_id=organization_id,
        project_id=project_id,
        currency_id=currency_id,
        sort_by=sort_by,
        sort_order=sort_order,
    )


@router.get("/{asset_id}", response_model=schemas.AssetRead)
async def get_asset(asset_id: int, db: AsyncSession = Depends(get_db)):
    return await service.get_asset(db, asset_id)


@router.post("/", response_model=schemas.AssetRead, status_code=201)
async def create_asset(
    data: schemas.AssetCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return await service.create_asset(db, data, user)


@router.patch("/{asset_id}", response_model=schemas.AssetRead)
async def update_asset(
    asset_id: int,
    data: schemas.AssetUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return await service.update_asset(db, asset_id, data, user)


@router.post("/{asset_id}/archive", response_model=schemas.AssetRead)
async def archive_asset(
    asset_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return await service.archive_asset(db, asset_id, user)


@router.post("/{asset_id}/restore", response_model=schemas.AssetRead)
async def restore_asset(
    asset_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return await service.restore_asset(db, asset_id, user)


@router.delete("/{asset_id}", status_code=204)
async def delete_asset(
    asset_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    await service.delete_asset(db, asset_id, user)


# --- Field Values ---


@router.put("/{asset_id}/field-values", response_model=list[schemas.AssetFieldValueRead])
async def update_field_values(
    asset_id: int,
    data: list[schemas.AssetFieldValueWrite],
    db: AsyncSession = Depends(get_db),
):
    return await service.update_field_values(db, asset_id, data)


# --- Cost History ---


@router.get("/{asset_id}/cost-history", response_model=list[schemas.CostHistoryRead])
async def get_cost_history(asset_id: int, db: AsyncSession = Depends(get_db)):
    return await service.get_cost_history(db, asset_id)


# --- Payments ---


@router.get("/{asset_id}/payments", response_model=list[schemas.PaymentRead])
async def get_payments(asset_id: int, db: AsyncSession = Depends(get_db)):
    return await service.get_payments(db, asset_id)


@router.post("/{asset_id}/payments", response_model=schemas.PaymentRead, status_code=201)
async def create_payment(
    asset_id: int,
    data: schemas.PaymentCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return await service.create_payment(db, asset_id, data, user)


@router.patch("/payments/{payment_id}", response_model=schemas.PaymentRead)
async def update_payment(
    payment_id: int,
    data: schemas.PaymentUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return await service.update_payment(db, payment_id, data, user)


@router.delete("/payments/{payment_id}", status_code=204)
async def delete_payment(
    payment_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    await service.delete_payment(db, payment_id, user)


ALLOWED_INVOICE_EXTENSIONS = {
    ".pdf", ".doc", ".docx", ".xls", ".xlsx",
    ".png", ".jpg", ".jpeg", ".bmp", ".webp", ".svg",
}
MAX_INVOICE_SIZE = 10 * 1024 * 1024  # 10 MB


@router.post("/payments/{payment_id}/invoice", response_model=schemas.PaymentRead)
async def upload_invoice(
    payment_id: int,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    import os
    import uuid
    from datetime import datetime as dt
    from app.core.exceptions import NotFoundError

    if not settings.s3_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Хранилище S3 не настроено",
        )

    result = await db.execute(select(AssetPayment).where(AssetPayment.id == payment_id))
    payment = result.scalar_one_or_none()
    if payment is None:
        raise NotFoundError("Payment", payment_id)

    original_filename = file.filename or "invoice.pdf"
    ext = os.path.splitext(original_filename)[1].lower()
    if ext not in ALLOWED_INVOICE_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Недопустимый формат файла. Разрешены: {', '.join(sorted(ALLOWED_INVOICE_EXTENSIONS))}",
        )

    content = await file.read()
    if len(content) > MAX_INVOICE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Размер файла не должен превышать 10 МБ",
        )

    now = dt.utcnow()
    file_uuid = uuid.uuid4().hex
    storage_path = f"invoices/{now.year}/{now.month:02d}/{file_uuid}{ext}"
    content_type = file.content_type or "application/octet-stream"

    storage = get_storage()
    # Delete old invoice if exists
    if payment.invoice_url:
        try:
            await storage.delete(payment.invoice_url)
        except Exception:
            pass

    url = await storage.upload(storage_path, content, content_type)
    payment.invoice_url = storage_path
    payment.invoice_filename = original_filename
    await db.commit()
    await db.refresh(payment)
    return payment


@router.get("/payments/{payment_id}/invoice")
async def download_invoice(
    payment_id: int,
    inline: bool = Query(False),
    db: AsyncSession = Depends(get_db),
):
    import os
    from fastapi.responses import RedirectResponse
    from app.core.exceptions import NotFoundError

    result = await db.execute(select(AssetPayment).where(AssetPayment.id == payment_id))
    payment = result.scalar_one_or_none()
    if payment is None:
        raise NotFoundError("Payment", payment_id)
    if not payment.invoice_url:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Инвойс не найден")

    filename = payment.invoice_filename or "invoice"
    ext = os.path.splitext(payment.invoice_url)[1].lower()
    disposition = "inline" if inline and ext in (".pdf", ".png", ".jpg", ".jpeg", ".bmp", ".webp", ".svg") else "attachment"

    storage = get_storage()
    from app.core.storage import S3Storage
    if isinstance(storage, S3Storage):
        # Check that the file exists in S3
        try:
            storage.client.head_object(Bucket=storage.bucket, Key=payment.invoice_url)
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Файл не найден в файловом хранилище. Возможно, он был удалён или перемещён",
            )
        url = storage.client.generate_presigned_url(
            "get_object",
            Params={
                "Bucket": storage.bucket,
                "Key": payment.invoice_url,
                "ResponseContentDisposition": f'{disposition}; filename="{filename}"',
            },
            ExpiresIn=300,
        )
    else:
        filepath = os.path.join(os.path.dirname(__file__), "..", "..", "..", "uploads", payment.invoice_url)
        if not os.path.exists(filepath):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Файл не найден в файловом хранилище. Возможно, он был удалён или перемещён",
            )
        url = f"/api/uploads/{payment.invoice_url}"
    return RedirectResponse(url=url)


@router.delete("/payments/{payment_id}/invoice", status_code=204)
async def delete_invoice(
    payment_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    from app.core.exceptions import NotFoundError

    result = await db.execute(select(AssetPayment).where(AssetPayment.id == payment_id))
    payment = result.scalar_one_or_none()
    if payment is None:
        raise NotFoundError("Payment", payment_id)
    if payment.invoice_url:
        storage = get_storage()
        try:
            await storage.delete(payment.invoice_url)
        except Exception:
            pass
    payment.invoice_url = None
    payment.invoice_filename = None
    await db.commit()




# --- Notification Settings ---


@router.get(
    "/{asset_id}/notification-settings", response_model=list[schemas.AssetNotificationSettingRead]
)
async def get_notification_settings(asset_id: int, db: AsyncSession = Depends(get_db)):
    return await service.get_notification_settings(db, asset_id)


@router.put(
    "/{asset_id}/notification-settings", response_model=list[schemas.AssetNotificationSettingRead]
)
async def update_notification_settings(
    asset_id: int,
    data: schemas.AssetNotificationSettingWrite,
    db: AsyncSession = Depends(get_db),
):
    return await service.update_notification_settings(db, asset_id, data)
