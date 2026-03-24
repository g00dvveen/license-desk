import api from "@/api/client";
import { wrapArray } from "@/api/helpers";
import type {
  AssetCreate,
  AssetFieldValueRead,
  AssetFieldValueWrite,
  AssetNotificationSettingRead,
  AssetRead,
  AssetUpdate,
  CostHistoryRead,
  PaginatedResponse,
  PaymentCreate,
  PaymentRead,
} from "@/api/types";

export async function getAssets(
  params?: {
    page?: number;
    size?: number;
    search?: string;
    type_id?: number;
    organization_id?: number;
    project_id?: number;
    currency_id?: number;
    is_archived?: boolean;
    sort_by?: string;
    sort_order?: string;
  },
): Promise<PaginatedResponse<AssetRead>> {
  const { data } = await api.get("/assets/", { params });
  return wrapArray(data, params?.page, params?.size);
}

export async function getAsset(id: number): Promise<AssetRead> {
  const { data } = await api.get(`/assets/${id}`);
  return data;
}

export async function createAsset(payload: AssetCreate): Promise<AssetRead> {
  const { data } = await api.post("/assets/", payload);
  return data;
}

export async function updateAsset(id: number, payload: AssetUpdate): Promise<AssetRead> {
  const { data } = await api.patch(`/assets/${id}`, payload);
  return data;
}

export async function archiveAsset(id: number): Promise<AssetRead> {
  const { data } = await api.post(`/assets/${id}/archive`);
  return data;
}

export async function deleteAsset(id: number): Promise<void> {
  await api.delete(`/assets/${id}`);
}

export async function restoreAsset(id: number): Promise<AssetRead> {
  const { data } = await api.post(`/assets/${id}/restore`);
  return data;
}

export async function updateFieldValues(
  assetId: number,
  values: AssetFieldValueWrite[],
): Promise<AssetFieldValueRead[]> {
  const { data } = await api.put(`/assets/${assetId}/field-values`, values);
  return data;
}

export async function getCostHistory(assetId: number): Promise<CostHistoryRead[]> {
  const { data } = await api.get(`/assets/${assetId}/cost-history`);
  return data;
}

export async function getPayments(assetId: number): Promise<PaymentRead[]> {
  const { data } = await api.get(`/assets/${assetId}/payments`);
  return data;
}

export async function createPayment(
  assetId: number,
  payload: PaymentCreate,
): Promise<PaymentRead> {
  const { data } = await api.post(`/assets/${assetId}/payments`, payload);
  return data;
}

export async function updatePayment(
  paymentId: number,
  payload: { date?: string; amount?: number; currency_id?: number; comment?: string | null },
): Promise<PaymentRead> {
  const { data } = await api.patch(`/assets/payments/${paymentId}`, payload);
  return data;
}

export async function deletePayment(paymentId: number): Promise<void> {
  await api.delete(`/assets/payments/${paymentId}`);
}

export async function uploadInvoice(paymentId: number, file: File): Promise<PaymentRead> {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await api.post(`/assets/payments/${paymentId}/invoice`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function deleteInvoice(paymentId: number): Promise<void> {
  await api.delete(`/assets/payments/${paymentId}/invoice`);
}

export async function getStorageInfo(): Promise<{ s3_enabled: boolean }> {
  const { data } = await api.get("/assets/storage-info");
  return data;
}

export async function getNotificationSettings(
  assetId: number,
): Promise<AssetNotificationSettingRead[]> {
  const { data } = await api.get(`/assets/${assetId}/notification-settings`);
  return data;
}

export async function updateNotificationSettings(
  assetId: number,
  payload: { days_before: number[] },
): Promise<AssetNotificationSettingRead[]> {
  const { data } = await api.put(`/assets/${assetId}/notification-settings`, payload);
  return data;
}
