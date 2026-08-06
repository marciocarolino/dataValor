export declare class MailService {
    private readonly logger;
    private readonly transporter;
    private readonly env;
    constructor();
    sendEmailVerification(to: string, token: string, name?: string | null): Promise<void>;
}
