import api from "@/api/client";
import type { SettingRead, SettingUpdate } from "@/api/types";

export async function getSettings(): Promise<SettingRead[]> {
  const { data } = await api.get("/settings/");
  return data;
}

export async function updateSetting(
  key: string,
  payload: SettingUpdate,
): Promise<SettingRead> {
  const { data } = await api.patch(`/settings/${key}`, payload);
  return data;
}
