from pydantic import BaseModel


class ExportAssetsRequest(BaseModel):
    organization_id: int | None = None
    project_id: int | None = None
    type_id: int | None = None
    currency_id: int | None = None
    search: str | None = None
    is_archived: bool = False
    columns: list[str] | None = None  # if None, export all standard columns
