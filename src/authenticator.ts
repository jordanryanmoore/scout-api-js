import { decode } from 'jsonwebtoken';
import { UnauthenticatedApi, MemberCredentials } from '../generated-src';

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
    // eslint-disable-next-line @typescript-eslint/no-magic-numbers
    private static readonly DEFAULT_REFRESH_INTERVAL = 24 * 60 * 60 * 1000; // 1 day

    // eslint-disable-next-line no-useless-constructor
    public constructor(private readonly api: UnauthenticatedApi = new UnauthenticatedApi()) {}

    public async create(request: MemberCredentials): Promise<Authenticator> {
        const api = this.api;
        let jwt = (await api.login(request)).data.jwt;
        let error: Error | undefined;
        let timeout: NodeJS.Timeout;

        const refresh = (): void => {
            api.login(request)
                .then(response => {
                    jwt = response.data.jwt;
                    error = undefined;
                })
                .catch(e => {
                    error = e as Error;
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
            refresh: (interval = AuthenticatorFactory.DEFAULT_REFRESH_INTERVAL): void => {
                if (timeout !== undefined) {
                    clearInterval(timeout);
                }

                if (false !== interval) {
                    timeout = setInterval(refresh, interval);
                }
            },
        };
    }
}
