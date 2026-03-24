import api from "@/api/client";
import { wrapArray } from "@/api/helpers";
import type {
  PaginatedResponse,
  PermissionCreate,
  PermissionRead,
  UserCreate,
  UserRead,
  UserUpdate,
} from "@/api/types";

export async function getUsers(
  params?: { page?: number; size?: number; search?: string },
): Promise<PaginatedResponse<UserRead>> {
  const { data } = await api.get("/users/", { params });
  return wrapArray(data, params?.page, params?.size);
}

export async function getUser(id: number): Promise<UserRead> {
  const { data } = await api.get(`/users/${id}`);
  return data;
}

export async function createUser(payload: UserCreate): Promise<UserRead> {
  const { data } = await api.post("/users/", payload);
  return data;
}

export async function updateUser(id: number, payload: UserUpdate): Promise<UserRead> {
  const { data } = await api.patch(`/users/${id}`, payload);
  return data;
}

export async function getUserPermissions(userId: number): Promise<PermissionRead[]> {
  const { data } = await api.get(`/users/${userId}/permissions`);
  return data;
}

export async function createPermission(payload: PermissionCreate): Promise<PermissionRead> {
  const { data } = await api.post("/users/permissions", payload);
  return data;
}

export async function deletePermission(permissionId: number): Promise<void> {
  await api.delete(`/users/permissions/${permissionId}`);
}
