"""File storage abstraction: local filesystem or S3-compatible."""

import os
from abc import ABC, abstractmethod

from app.config import settings


class FileStorage(ABC):
    @abstractmethod
    async def upload(self, path: str, content: bytes, content_type: str = "") -> str:
        """Upload file, return public URL."""

    @abstractmethod
    async def delete(self, path: str) -> None:
        """Delete file by storage path."""


class LocalStorage(FileStorage):
    def __init__(self, base_dir: str, url_prefix: str):
        self.base_dir = base_dir
        self.url_prefix = url_prefix

    async def upload(self, path: str, content: bytes, content_type: str = "") -> str:
        filepath = os.path.join(self.base_dir, path)
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        with open(filepath, "wb") as f:
            f.write(content)
        return f"{self.url_prefix}/{path}"

    async def delete(self, path: str) -> None:
        filepath = os.path.join(self.base_dir, path)
        if os.path.exists(filepath):
            os.remove(filepath)


class S3Storage(FileStorage):
    def __init__(self):
        import boto3
        session = boto3.session.Session()
        kwargs = {
            "aws_access_key_id": settings.s3_access_key,
            "aws_secret_access_key": settings.s3_secret_key,
        }
        if settings.s3_endpoint_url:
            kwargs["endpoint_url"] = settings.s3_endpoint_url
        if settings.s3_region:
            kwargs["region_name"] = settings.s3_region
        self.client = session.client("s3", **kwargs)
        self.bucket = settings.s3_bucket
        self.public_url = settings.s3_public_url.rstrip("/") if settings.s3_public_url else ""

    async def upload(self, path: str, content: bytes, content_type: str = "") -> str:
        extra_args = {}
        if content_type:
            extra_args["ContentType"] = content_type
        self.client.put_object(
            Bucket=self.bucket,
            Key=path,
            Body=content,
            **extra_args,
        )
        if self.public_url:
            return f"{self.public_url}/{path}"
        return f"{settings.s3_endpoint_url}/{self.bucket}/{path}"

    async def delete(self, path: str) -> None:
        self.client.delete_object(Bucket=self.bucket, Key=path)


def get_storage() -> FileStorage:
    if settings.s3_enabled:
        return S3Storage()
    base_dir = os.path.join(os.path.dirname(__file__), "..", "..", "uploads")
    return LocalStorage(base_dir, "/api/uploads")
