import api from "@/api/client";
import type {
  AssetTypeCreate,
  AssetTypeFieldCreate,
  AssetTypeFieldRead,
  AssetTypeFieldUpdate,
  AssetTypeRead,
  AssetTypeUpdate,
  CurrencyCreate,
  CurrencyRead,
  CurrencyUpdate,
  OrganizationCreate,
  OrganizationRead,
  OrganizationUpdate,
  PaginatedResponse,
  ProjectCreate,
  ProjectRead,
  ProjectUpdate,
  RenewalPeriodCreate,
  RenewalPeriodRead,
  RenewalPeriodUpdate,
} from "@/api/types";

import { wrapArray } from "@/api/helpers";

// ── Organizations ──

export async function getOrganizations(
  params?: { page?: number; size?: number },
): Promise<PaginatedResponse<OrganizationRead>> {
  const { data } = await api.get("/references/organizations", { params });
  return wrapArray(data, params?.page, params?.size);
}

export async function createOrganization(
  payload: OrganizationCreate,
): Promise<OrganizationRead> {
  const { data } = await api.post("/references/organizations", payload);
  return data;
}

export async function updateOrganization(
  id: number,
  payload: OrganizationUpdate,
): Promise<OrganizationRead> {
  const { data } = await api.patch(`/references/organizations/${id}`, payload);
  return data;
}

export async function deleteOrganization(id: number): Promise<void> {
  await api.delete(`/references/organizations/${id}`);
}

// ── Projects ──

export async function getProjects(
  params?: { page?: number; size?: number; organization_id?: number },
): Promise<PaginatedResponse<ProjectRead>> {
  const { data } = await api.get("/references/projects", { params });
  return wrapArray(data, params?.page, params?.size);
}

export async function createProject(payload: ProjectCreate): Promise<ProjectRead> {
  const { data } = await api.post("/references/projects", payload);
  return data;
}

export async function updateProject(
  id: number,
  payload: ProjectUpdate,
): Promise<ProjectRead> {
  const { data } = await api.patch(`/references/projects/${id}`, payload);
  return data;
}

export async function deleteProject(id: number): Promise<void> {
  await api.delete(`/references/projects/${id}`);
}

// ── Currencies ──

export async function getCurrencies(
  params?: { page?: number; size?: number },
): Promise<PaginatedResponse<CurrencyRead>> {
  const { data } = await api.get("/references/currencies", { params });
  return wrapArray(data, params?.page, params?.size);
}

export async function createCurrency(payload: CurrencyCreate): Promise<CurrencyRead> {
  const { data } = await api.post("/references/currencies", payload);
  return data;
}

export async function updateCurrency(
  id: number,
  payload: CurrencyUpdate,
): Promise<CurrencyRead> {
  const { data } = await api.patch(`/references/currencies/${id}`, payload);
  return data;
}

export async function deleteCurrency(id: number): Promise<void> {
  await api.delete(`/references/currencies/${id}`);
}

// ── Renewal Periods ──

export async function getRenewalPeriods(
  params?: { page?: number; size?: number },
): Promise<PaginatedResponse<RenewalPeriodRead>> {
  const { data } = await api.get("/references/renewal-periods", { params });
  return wrapArray(data, params?.page, params?.size);
}

export async function createRenewalPeriod(
  payload: RenewalPeriodCreate,
): Promise<RenewalPeriodRead> {
  const { data } = await api.post("/references/renewal-periods", payload);
  return data;
}

export async function updateRenewalPeriod(
  id: number,
  payload: RenewalPeriodUpdate,
): Promise<RenewalPeriodRead> {
  const { data } = await api.patch(`/references/renewal-periods/${id}`, payload);
  return data;
}

export async function deleteRenewalPeriod(id: number): Promise<void> {
  await api.delete(`/references/renewal-periods/${id}`);
}

// ── Asset Types ──

export async function getAssetTypes(
  params?: { page?: number; size?: number },
): Promise<PaginatedResponse<AssetTypeRead>> {
  const { data } = await api.get("/references/asset-types", { params });
  return wrapArray(data, params?.page, params?.size);
}

export async function getAssetType(id: number): Promise<AssetTypeRead> {
  const { data } = await api.get(`/references/asset-types/${id}`);
  return data;
}

export async function createAssetType(payload: AssetTypeCreate): Promise<AssetTypeRead> {
  const { data } = await api.post("/references/asset-types", payload);
  return data;
}

export async function updateAssetType(
  id: number,
  payload: AssetTypeUpdate,
): Promise<AssetTypeRead> {
  const { data } = await api.patch(`/references/asset-types/${id}`, payload);
  return data;
}

export async function deleteAssetType(id: number): Promise<void> {
  await api.delete(`/references/asset-types/${id}`);
}

// ── Asset Type Fields ──

export async function createAssetTypeField(
  typeId: number,
  payload: AssetTypeFieldCreate,
): Promise<AssetTypeFieldRead> {
  const { data } = await api.post(`/references/asset-types/${typeId}/fields`, payload);
  return data;
}

export async function updateAssetTypeField(
  fieldId: number,
  payload: AssetTypeFieldUpdate,
): Promise<AssetTypeFieldRead> {
  const { data } = await api.patch(`/references/asset-type-fields/${fieldId}`, payload);
  return data;
}

export async function deleteAssetTypeField(fieldId: number): Promise<void> {
  await api.delete(`/references/asset-type-fields/${fieldId}`);
}
