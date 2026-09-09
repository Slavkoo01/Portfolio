"""
Cloudflare R2 storage backend (S3-compatible via boto3).

Implements the StorageService interface so swapping local -> r2 is a config
change only. Public reads go through R2_PUBLIC_BASE_URL (the pub-*.r2.dev URL
or a custom domain); uploads use presigned PUT URLs for direct-to-storage.
"""
from __future__ import annotations

from typing import BinaryIO

import boto3
from botocore.client import Config

from app.services.storage.base import StorageService


class R2StorageService(StorageService):
    def __init__(self, *, account_id: str, access_key_id: str,
                 secret_access_key: str, bucket: str, public_base_url: str):
        if not all([account_id, access_key_id, secret_access_key, bucket]):
            raise RuntimeError("R2 storage is missing required configuration.")

        self.bucket = bucket
        self.public_base_url = public_base_url.rstrip("/")
        endpoint = f"https://{account_id}.r2.cloudflarestorage.com"

        # R2 requires SigV4 and 'auto' region.
        self._client = boto3.client(
            "s3",
            endpoint_url=endpoint,
            aws_access_key_id=access_key_id,
            aws_secret_access_key=secret_access_key,
            region_name="auto",
            config=Config(signature_version="s3v4"),
        )

    @staticmethod
    def _key(storage_key: str) -> str:
        # Keys are stored without a leading slash to match get_url output.
        return storage_key.lstrip("/")

    def save(self, file_stream: BinaryIO, storage_key: str, *,
             content_type: str | None = None) -> str:
        extra = {"ContentType": content_type} if content_type else {}
        self._client.upload_fileobj(
            file_stream, self.bucket, self._key(storage_key), ExtraArgs=extra
        )
        return storage_key

    def delete(self, storage_key: str) -> None:
        # delete_object is idempotent — no error if the key is absent.
        self._client.delete_object(Bucket=self.bucket, Key=self._key(storage_key))

    def exists(self, storage_key: str) -> bool:
        from botocore.exceptions import ClientError
        try:
            self._client.head_object(Bucket=self.bucket, Key=self._key(storage_key))
            return True
        except ClientError as e:
            if e.response["Error"]["Code"] in ("404", "NoSuchKey", "NotFound"):
                return False
            raise

    def get_url(self, storage_key: str) -> str:
        # Public read via the bucket's public dev URL / custom domain.
        return f"{self.public_base_url}/{self._key(storage_key)}"

    def generate_upload_url(self, storage_key: str, *,
                            content_type: str | None = None) -> dict | None:
        params = {"Bucket": self.bucket, "Key": self._key(storage_key)}
        if content_type:
            params["ContentType"] = content_type
        url = self._client.generate_presigned_url(
            "put_object", Params=params, ExpiresIn=3600
        )
        return {"url": url, "method": "PUT", "headers":
                ({"Content-Type": content_type} if content_type else {})}