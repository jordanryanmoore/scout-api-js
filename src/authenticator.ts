import { decode } from 'jsonwebtoken';
import { UnauthenticatedApi, MemberCredentials } from '../generated-src';

export interface Payload {
    id: string;
    fname: string;
    email: string;
    token: string;
    iat: number;
    exp: number;
}

export interface Authenticator {
    getToken(): Promise<string>;
    getPayload(): Promise<Payload>;
}

export class AuthenticatorFactory {
    // eslint-disable-next-line @typescript-eslint/no-magic-numbers
    private static readonly DEFAULT_CACHE_TTL = 24 * 60 * 60 * 1000; // 1 day

    // eslint-disable-next-line no-useless-constructor
    public constructor(
        private readonly cacheTtl: number = AuthenticatorFactory.DEFAULT_CACHE_TTL,
        private readonly api: UnauthenticatedApi = new UnauthenticatedApi(),
    ) {}

    public create(request: MemberCredentials): Authenticator {
        let token: string | undefined;

        const api = this.api;
        const getToken = async (): Promise<string> => {
            if (!token) {
                token = (await api.login(request)).data.jwt;

                setTimeout((): void => {
                    token = undefined;
                }, this.cacheTtl);
            }

            return token;
        };

        return {
            getToken,
            getPayload: async (): Promise<Payload> => {
                return decode(await getToken()) as Payload;
            },
        };
    }
}
