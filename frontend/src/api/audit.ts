import api from "@/api/client";
import { wrapArray } from "@/api/helpers";
import type { AuditLogRead, PaginatedResponse } from "@/api/types";

export async function getAuditLogs(
  params?: {
    page?: number;
    size?: number;
    entity_type?: string;
    entity_id?: number;
    user_id?: number;
    action?: string;
    date_from?: string;
    date_to?: string;
  },
): Promise<PaginatedResponse<AuditLogRead>> {
  const { data } = await api.get("/audit/", { params });
  return wrapArray(data, params?.page, params?.size);
}
