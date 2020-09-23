import { decode } from 'jsonwebtoken';
import { UnauthenticatedApi, MemberCredentials } from '../generated-src';

export interface Authenticator {
    getToken(): Promise<string>;
    getPayload(): Promise<Payload>;
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
    private static readonly DEFAULT_CACHE_TTL = 24 * 60 * 60 * 1000; // 1 day

    // eslint-disable-next-line no-useless-constructor
    public constructor(private readonly api: UnauthenticatedApi = new UnauthenticatedApi()) {}

    public create(request: MemberCredentials, cacheTtl = AuthenticatorFactory.DEFAULT_CACHE_TTL): Authenticator {
        let token: string | undefined;

        const api = this.api;
        const getToken = async (): Promise<string> => {
            if (!token) {
                token = await api.login(request).data.jwt;

                setTimeout((): void => {
                    token = undefined;
                }, cacheTtl);
            }

            return token;
        };

        return {
            getToken,
            getPayload: (): Promise<Payload> => {
                return decode(getToken()) as Payload;
            },
        };
    }
}
