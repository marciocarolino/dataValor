export declare class HealthController {
    health(): import("../../common/response/api-response").ApiSuccessResponse<{
        status: string;
        service: string;
        timestamp: string;
    }>;
}
