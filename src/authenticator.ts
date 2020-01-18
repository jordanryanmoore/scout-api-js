import { UnauthenticatedApi, LoginRequest } from "../generated-src";
import { decode } from "jsonwebtoken";

export interface Authenticator {
    getToken(): string;
    getPayload(): Payload;
    refresh(interval: number | false): void;
}

export interface Payload {
    id: string;
    fname: string;
    email: string;
    token: string;
    iat: number;
    exp: number;
}

export class AuthenticatorFactory {
    public constructor(private readonly api: UnauthenticatedApi = new UnauthenticatedApi()) {
    }

    public async create(request: LoginRequest): Promise<Authenticator> {
        const api = this.api;
        let jwt = (await api.login(request)).data.jwt;
        let error: Error | undefined;
        let timeout: NodeJS.Timeout;
    
        const refresh = (): void => {
            api.login(request).then(response => {
                jwt = response.data.jwt;
                error = undefined;
            }).catch(e => {
                error = e;
            });
        };
    
        return {
            getToken: (): string => {
                if (error !== undefined) {
                    throw error;
                }
    
                return jwt;
            },
            getPayload: (): Payload => {
                if (error !== undefined) {
                    throw error;
                }
    
                return decode(jwt) as Payload;
            },
            refresh: (interval = 24 * 60 * 60 * 1000): void => {
                if (timeout !== undefined) {
                    clearInterval(timeout);
                }
    
                if (false !== interval) {
                    setInterval(refresh, interval);
                }
            },
        };
    }
}
