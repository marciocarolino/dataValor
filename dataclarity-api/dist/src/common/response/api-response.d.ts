export interface ApiSuccessResponse<T> {
    success: true;
    data: T;
    timestamp: string;
}
export interface ApiErrorResponse {
    success: false;
    statusCode: number;
    message: string;
    errors: Array<{
        field?: string;
        message: string;
    }>;
    timestamp: string;
    path: string;
}
export declare const nowIso: () => string;
export declare const ok: <T>(data: T) => ApiSuccessResponse<T>;
