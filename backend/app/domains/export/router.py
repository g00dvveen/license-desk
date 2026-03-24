from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db, get_current_user
from app.domains.export import schemas, service

router = APIRouter()


@router.post("/assets")
async def export_assets(
    data: schemas.ExportAssetsRequest,
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
):
    output = await service.export_assets(db, data)
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=assets.xlsx"},
    )
