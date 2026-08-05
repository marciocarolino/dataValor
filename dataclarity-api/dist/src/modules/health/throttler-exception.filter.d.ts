import { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
export declare class ThrottlerExceptionFilter implements ExceptionFilter {
    catch(_exception: ThrottlerException, host: ArgumentsHost): void;
}
