export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface ListaCnpjResponseDto<T> {
  data: T[];
  meta: PaginationMeta;
}
