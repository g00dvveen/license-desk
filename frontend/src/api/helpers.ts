import type { PaginatedResponse } from "@/api/types";

export function wrapArray<T>(
  data: T[] | PaginatedResponse<T>,
  page = 1,
  size = 20,
): PaginatedResponse<T> {
  if (Array.isArray(data)) {
    return { items: data, total: data.length, page, size, pages: 1 };
  }
  return data;
}
