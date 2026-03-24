from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError


class NotFoundError(HTTPException):
    def __init__(self, entity: str, entity_id: int | str):
        super().__init__(status_code=404, detail=f"{entity} with id={entity_id} not found")


class ConflictError(HTTPException):
    def __init__(self, detail: str):
        super().__init__(status_code=409, detail=detail)


def setup_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail},
        )

    @app.exception_handler(IntegrityError)
    async def integrity_error_handler(request: Request, exc: IntegrityError):
        detail = "Запись с такими данными уже существует"
        orig = str(exc.orig) if exc.orig else ""
        if "unique" in orig.lower() or "duplicate" in orig.lower():
            detail = "Запись с таким значением уже существует"
        return JSONResponse(
            status_code=409,
            content={"detail": detail},
        )
