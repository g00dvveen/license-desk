// ── Auth ──
export interface LoginRequest {
  email: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface UserRead {
  id: number;
  email: string;
  last_name: string;
  first_name: string;
  middle_name?: string | null;
  full_name: string;
  is_active: boolean;
  is_superuser: boolean;
}

export interface UserCreate {
  email: string;
  last_name: string;
  first_name: string;
  middle_name?: string | null;
  password: string;
  is_superuser?: boolean;
}

export interface UserUpdate {
  last_name?: string;
  first_name?: string;
  middle_name?: string | null;
  is_active?: boolean;
  is_superuser?: boolean;
}

// ── Permissions ──
export type RoleType = "manager" | "viewer";

export interface PermissionCreate {
  user_id: number;
  role: RoleType;
  organization_id?: number | null;
  project_id?: number | null;
}

export interface PermissionRead {
  id: number;
  user_id: number;
  role: RoleType;
  organization_id?: number | null;
  project_id?: number | null;
}

// ── References ──
export interface OrganizationRead {
  id: number;
  name: string;
  external_id?: string | null;
  bin?: string | null;
  full_name?: string | null;
}

export interface OrganizationCreate {
  name: string;
  external_id?: string | null;
  bin?: string | null;
  full_name?: string | null;
}

export interface OrganizationUpdate {
  name?: string;
  external_id?: string | null;
  bin?: string | null;
  full_name?: string | null;
}

export interface ProjectRead {
  id: number;
  name: string;
  organization_id?: number | null;
}

export interface ProjectCreate {
  name: string;
  organization_id?: number | null;
}

export interface ProjectUpdate {
  name?: string;
  organization_id?: number | null;
}

export interface CurrencyRead {
  id: number;
  code: string;
  name: string;
  symbol: string;
}

export interface CurrencyCreate {
  code: string;
  name: string;
  symbol: string;
}

export interface CurrencyUpdate {
  code?: string;
  name?: string;
  symbol?: string;
}

export interface RenewalPeriodRead {
  id: number;
  name: string;
  months: number;
}

export interface RenewalPeriodCreate {
  name: string;
  months: number;
}

export interface RenewalPeriodUpdate {
  name?: string;
  months?: number;
}

export type FieldDataType = "string" | "number" | "date" | "boolean" | "reference";

export interface AssetTypeFieldCreate {
  name: string;
  data_type: FieldDataType;
  sort_order?: number;
  is_hidden?: boolean;
}

export interface AssetTypeFieldUpdate {
  name?: string;
  data_type?: FieldDataType;
  sort_order?: number;
  is_hidden?: boolean;
}

export interface AssetTypeFieldRead {
  id: number;
  type_id: number;
  name: string;
  data_type: FieldDataType;
  sort_order: number;
  is_hidden: boolean;
}

export interface AssetTypeRead {
  id: number;
  name: string;
  description?: string | null;
  fields: AssetTypeFieldRead[];
}

export interface AssetTypeCreate {
  name: string;
  description?: string | null;
  fields?: AssetTypeFieldCreate[];
}

export interface AssetTypeUpdate {
  name?: string;
  description?: string | null;
}

// ── Assets ──
export interface AssetFieldValueWrite {
  field_id: number;
  value: unknown;
}

export interface AssetFieldValueRead {
  id: number;
  asset_id: number;
  field_id: number;
  value: unknown;
}

export type RenewalType = "fixed" | "manual";

export interface AssetCreate {
  name: string;
  type_id: number;
  organization_id: number;
  project_id?: number | null;
  cost: number;
  currency_id: number;
  purchase_date: string;
  next_payment_date?: string | null;
  renewal_period_id?: number | null;
  renewal_type?: RenewalType;
  admin_account?: string | null;
  comment?: string | null;
  field_values?: AssetFieldValueWrite[];
}

export interface AssetUpdate {
  name?: string;
  type_id?: number;
  organization_id?: number;
  project_id?: number | null;
  cost?: number;
  currency_id?: number;
  purchase_date?: string;
  next_payment_date?: string | null;
  renewal_period_id?: number | null;
  renewal_type?: RenewalType;
  notifications_enabled?: boolean;
  admin_account?: string | null;
  comment?: string | null;
}

export interface AssetRead {
  id: number;
  name: string;
  type_id: number;
  organization_id: number;
  project_id?: number | null;
  cost: number;
  currency_id: number;
  purchase_date: string;
  next_payment_date?: string | null;
  renewal_period_id?: number | null;
  admin_account?: string | null;
  comment?: string | null;
  renewal_type: RenewalType;
  notifications_enabled: boolean;
  is_archived: boolean;
  field_values: AssetFieldValueRead[];
}

export interface CostHistoryRead {
  id: number;
  asset_id: number;
  old_value: number;
  new_value: number;
  currency_id: number;
  old_currency_id?: number | null;
  changed_by: number;
  changed_at: string;
}

export interface PaymentCreate {
  date: string;
  amount: number;
  currency_id: number;
  comment?: string | null;
  next_payment_date?: string | null;
}

export interface PaymentRead {
  id: number;
  asset_id: number;
  date: string;
  amount: number;
  currency_id: number;
  comment?: string | null;
  invoice_url?: string | null;
  invoice_filename?: string | null;
  created_by: number;
  created_at: string;
}

export interface AssetNotificationSettingRead {
  id: number;
  asset_id: number;
  days_before: number;
}

// ── Notifications ──
export interface NotificationRead {
  id: number;
  user_id: number;
  title: string;
  message: string;
  entity_type?: string | null;
  entity_id?: number | null;
  is_read: boolean;
  email_sent: boolean;
  created_at: string;
}

export interface UnreadCountRead {
  count: number;
}

// ── Export ──
export interface ExportAssetsRequest {
  organization_id?: number | null;
  project_id?: number | null;
  type_id?: number | null;
  currency_id?: number | null;
  search?: string | null;
  is_archived?: boolean;
  columns?: string[] | null;
}

// ── Audit ──
export interface AuditLogRead {
  id: number;
  user_id: number;
  action: string;
  entity_type: string;
  entity_id: number;
  old_values?: Record<string, unknown> | null;
  new_values?: Record<string, unknown> | null;
  ip_address?: string | null;
  created_at: string;
}

// ── Settings ──
export interface SettingRead {
  id: number;
  key: string;
  value: unknown;
}

export interface SettingUpdate {
  value: unknown;
}

// ── Pagination ──
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}
