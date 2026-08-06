import { Strategy } from 'passport-jwt';
export type JwtAccessPayload = {
    sub: string;
    email: string;
};
declare const JwtStrategy_base: new (...args: [opt: import("passport-jwt").StrategyOptionsWithRequest] | [opt: import("passport-jwt").StrategyOptionsWithoutRequest]) => Strategy & {
    validate(...args: any[]): unknown;
};
export declare class JwtStrategy extends JwtStrategy_base {
    private env;
    constructor();
    validate(payload: JwtAccessPayload): JwtAccessPayload;
}
export {};
