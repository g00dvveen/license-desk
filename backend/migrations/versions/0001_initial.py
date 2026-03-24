"""Initial schema

Revision ID: 0001
Revises:
Create Date: 2026-03-24
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── Users ──
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("hashed_password", sa.String(255), nullable=True),
        sa.Column("last_name", sa.String(255), nullable=False),
        sa.Column("first_name", sa.String(255), nullable=False),
        sa.Column("middle_name", sa.String(255), nullable=True),
        sa.Column("avatar_url", sa.String(500), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("is_superuser", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("keycloak_sub", sa.String(255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_users"),
        sa.UniqueConstraint("email", name="uq_users_email"),
        sa.UniqueConstraint("keycloak_sub", name="uq_users_keycloak_sub"),
    )
    op.create_index("ix_users_email", "users", ["email"])
    op.create_index("ix_users_keycloak_sub", "users", ["keycloak_sub"])

    # ── Organizations ──
    op.create_table(
        "organizations",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("external_id", sa.String(100), nullable=True),
        sa.Column("bin", sa.String(20), nullable=True),
        sa.Column("full_name", sa.String(500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_organizations"),
        sa.UniqueConstraint("external_id", name="uq_organizations_external_id"),
    )

    # ── Projects ──
    op.create_table(
        "projects",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("organization_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_projects"),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], name="fk_projects_organization_id_organizations"),
    )

    # ── Currencies ──
    op.create_table(
        "currencies",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("code", sa.String(10), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("symbol", sa.String(10), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_currencies"),
        sa.UniqueConstraint("code", name="uq_currencies_code"),
    )

    # ── Renewal Periods ──
    op.create_table(
        "renewal_periods",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("months", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_renewal_periods"),
    )

    # ── Asset Types ──
    op.create_table(
        "asset_types",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_asset_types"),
        sa.UniqueConstraint("name", name="uq_asset_types_name"),
    )

    # ── Asset Type Fields ──
    op.create_table(
        "asset_type_fields",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("type_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("data_type", sa.String(50), nullable=False),
        sa.Column("sort_order", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("is_hidden", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_asset_type_fields"),
        sa.ForeignKeyConstraint(["type_id"], ["asset_types.id"], name="fk_asset_type_fields_type_id_asset_types", ondelete="CASCADE"),
        sa.UniqueConstraint("type_id", "name", name="uq_asset_type_field_name"),
    )

    # ── Assets ──
    op.create_table(
        "assets",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("type_id", sa.Integer(), nullable=False),
        sa.Column("organization_id", sa.Integer(), nullable=False),
        sa.Column("project_id", sa.Integer(), nullable=True),
        sa.Column("cost", sa.Numeric(15, 2), server_default=sa.text("0"), nullable=False),
        sa.Column("currency_id", sa.Integer(), nullable=False),
        sa.Column("purchase_date", sa.Date(), nullable=False),
        sa.Column("next_payment_date", sa.Date(), nullable=True),
        sa.Column("renewal_period_id", sa.Integer(), nullable=True),
        sa.Column("admin_account", sa.String(255), nullable=True),
        sa.Column("comment", sa.Text(), nullable=True),
        sa.Column("renewal_type", sa.String(20), server_default=sa.text("'fixed'"), nullable=False),
        sa.Column("notifications_enabled", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("is_archived", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_assets"),
        sa.ForeignKeyConstraint(["type_id"], ["asset_types.id"], name="fk_assets_type_id_asset_types"),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], name="fk_assets_organization_id_organizations"),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], name="fk_assets_project_id_projects"),
        sa.ForeignKeyConstraint(["currency_id"], ["currencies.id"], name="fk_assets_currency_id_currencies"),
        sa.ForeignKeyConstraint(["renewal_period_id"], ["renewal_periods.id"], name="fk_assets_renewal_period_id_renewal_periods"),
    )
    op.create_index("ix_assets_type_id", "assets", ["type_id"])
    op.create_index("ix_assets_organization_id", "assets", ["organization_id"])
    op.create_index("ix_assets_project_id", "assets", ["project_id"])
    op.create_index("ix_assets_next_payment_date", "assets", ["next_payment_date"])

    # ── Asset Field Values ──
    op.create_table(
        "asset_field_values",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("asset_id", sa.Integer(), nullable=False),
        sa.Column("field_id", sa.Integer(), nullable=False),
        sa.Column("value", JSONB(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_asset_field_values"),
        sa.ForeignKeyConstraint(["asset_id"], ["assets.id"], name="fk_asset_field_values_asset_id_assets", ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["field_id"], ["asset_type_fields.id"], name="fk_asset_field_values_field_id_asset_type_fields", ondelete="CASCADE"),
        sa.UniqueConstraint("asset_id", "field_id", name="uq_asset_field_value"),
    )

    # ── Asset Cost History ──
    op.create_table(
        "asset_cost_history",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("asset_id", sa.Integer(), nullable=False),
        sa.Column("old_value", sa.Numeric(15, 2), nullable=False),
        sa.Column("new_value", sa.Numeric(15, 2), nullable=False),
        sa.Column("currency_id", sa.Integer(), nullable=False),
        sa.Column("old_currency_id", sa.Integer(), nullable=True),
        sa.Column("changed_by", sa.Integer(), nullable=False),
        sa.Column("changed_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_asset_cost_history"),
        sa.ForeignKeyConstraint(["asset_id"], ["assets.id"], name="fk_asset_cost_history_asset_id_assets", ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["currency_id"], ["currencies.id"], name="fk_asset_cost_history_currency_id_currencies"),
        sa.ForeignKeyConstraint(["old_currency_id"], ["currencies.id"], name="fk_asset_cost_history_old_currency_id_currencies"),
        sa.ForeignKeyConstraint(["changed_by"], ["users.id"], name="fk_asset_cost_history_changed_by_users"),
    )

    # ── Asset Payments ──
    op.create_table(
        "asset_payments",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("asset_id", sa.Integer(), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("amount", sa.Numeric(15, 2), nullable=False),
        sa.Column("currency_id", sa.Integer(), nullable=False),
        sa.Column("comment", sa.Text(), nullable=True),
        sa.Column("invoice_url", sa.String(500), nullable=True),
        sa.Column("invoice_filename", sa.String(255), nullable=True),
        sa.Column("created_by", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_asset_payments"),
        sa.ForeignKeyConstraint(["asset_id"], ["assets.id"], name="fk_asset_payments_asset_id_assets", ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["currency_id"], ["currencies.id"], name="fk_asset_payments_currency_id_currencies"),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], name="fk_asset_payments_created_by_users"),
    )

    # ── Asset Notification Settings ──
    op.create_table(
        "asset_notification_settings",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("asset_id", sa.Integer(), nullable=False),
        sa.Column("days_before", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_asset_notification_settings"),
        sa.ForeignKeyConstraint(["asset_id"], ["assets.id"], name="fk_asset_notification_settings_asset_id_assets", ondelete="CASCADE"),
        sa.UniqueConstraint("asset_id", "days_before", name="uq_asset_notification_days"),
    )

    # ── User Permissions ──
    op.create_table(
        "user_permissions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("role", sa.String(20), nullable=False),
        sa.Column("organization_id", sa.Integer(), nullable=True),
        sa.Column("project_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_user_permissions"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name="fk_user_permissions_user_id_users", ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], name="fk_user_permissions_organization_id_organizations"),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], name="fk_user_permissions_project_id_projects"),
        sa.UniqueConstraint("user_id", "role", "organization_id", "project_id", name="uq_user_permission"),
        sa.CheckConstraint("project_id IS NULL OR organization_id IS NOT NULL", name="ck_project_requires_org"),
    )

    # ── Notifications ──
    op.create_table(
        "notifications",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("entity_type", sa.String(50), nullable=True),
        sa.Column("entity_id", sa.Integer(), nullable=True),
        sa.Column("is_read", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("email_sent", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_notifications"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name="fk_notifications_user_id_users", ondelete="CASCADE"),
    )

    # ── System Settings ──
    op.create_table(
        "system_settings",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("key", sa.String(255), nullable=False),
        sa.Column("value", JSONB(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_system_settings"),
        sa.UniqueConstraint("key", name="uq_system_settings_key"),
    )

    # ── Audit Log ──
    op.create_table(
        "audit_log",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("action", sa.String(50), nullable=False),
        sa.Column("entity_type", sa.String(50), nullable=False),
        sa.Column("entity_id", sa.Integer(), nullable=False),
        sa.Column("old_values", JSONB(), nullable=True),
        sa.Column("new_values", JSONB(), nullable=True),
        sa.Column("ip_address", sa.String(45), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_audit_log"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name="fk_audit_log_user_id_users"),
    )

    # ── Seed: default system setting ──
    op.execute(
        "INSERT INTO system_settings (key, value) "
        "VALUES ('notification_days_before_payment', '[14]'::jsonb) "
        "ON CONFLICT (key) DO NOTHING"
    )


def downgrade() -> None:
    op.drop_table("audit_log")
    op.drop_table("system_settings")
    op.drop_table("notifications")
    op.drop_table("user_permissions")
    op.drop_table("asset_notification_settings")
    op.drop_table("asset_payments")
    op.drop_table("asset_cost_history")
    op.drop_table("asset_field_values")
    op.drop_table("assets")
    op.drop_table("asset_type_fields")
    op.drop_table("asset_types")
    op.drop_table("renewal_periods")
    op.drop_table("currencies")
    op.drop_table("projects")
    op.drop_table("organizations")
    op.drop_table("users")
