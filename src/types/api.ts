// Standard API response envelopes used across all route handlers

export type ApiSuccess<T> = {
  data: T;
  error?: never;
};

export type ApiError = {
  data?: never;
  error: string;
  details?: unknown;
};

export type ApiResponse<T> = ApiSuccess<T> | ApiError;
