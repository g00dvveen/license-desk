import api from "@/api/client";
import type { ExportAssetsRequest } from "@/api/types";

export async function exportAssets(payload: ExportAssetsRequest): Promise<Blob> {
  const { data } = await api.post("/export/assets", payload, {
    responseType: "blob",
  });
  return data;
}
