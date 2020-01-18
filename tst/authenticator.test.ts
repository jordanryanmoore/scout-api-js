import { UnauthenticatedApi, Session, LoginRequest } from "../generated-src";
import { AuthenticatorFactory, Payload } from "../src/authenticator";
import { AxiosPromise, AxiosResponse } from "axios";

jest.mock("../generated-src");

const EMAIL = "email1";
const PASSWORD = "password1";
const LOGIN_REQUEST = {
    email: EMAIL,
    password: PASSWORD,
};
const TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiIiLCJpYXQiOjE1NzkyNzg3NjMsImV4cCI6MTYxMDgxNDc2MywiYXVkIjoiIiwic3ViIjoiIiwiZm5hbWUiOiJuYW1lMSIsImVtYWlsIjoiZW1haWwxIiwidG9rZW4iOiJ0b2tlbjEiLCJpZCI6ImlkMSJ9.DJB1v6tzq6-8_sAaO195Zr74AIsEc8pcU-sRbvn8ERU";
const PAYLOAD = {
    id: "id1",
    fname: "name1",
    email: "email1",
    token: "token1",
    iat: 1579278763,
    exp: 1610814763,
} as Payload;

describe("Authenticator", () => {
    const UnauthenticatedApiMock = (UnauthenticatedApi as jest.Mock<UnauthenticatedApi>);
    const sleep = (timeout: number): Promise<void> => {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve();
            }, timeout);
        });
    };
    const mockAuthApi = (login: (request: LoginRequest) => AxiosPromise<Session>): void => {
        UnauthenticatedApiMock.mockImplementation(() => {
            return {
                login,
            } as UnauthenticatedApi;
        });
    };

    beforeEach(() => {
        UnauthenticatedApiMock.mockClear();
    });

    test("single use", async () => {
        mockAuthApi(async (): Promise<AxiosResponse<Session>> => {
            return {
                data: {
                    jwt: TOKEN,
                },
            } as AxiosResponse;
        });

        const authenticator = await new AuthenticatorFactory(new UnauthenticatedApi()).create(LOGIN_REQUEST);

        expect(authenticator.getToken()).toEqual(TOKEN);
        expect(authenticator.getPayload()).toMatchObject(PAYLOAD);
    });

    test("error on refresh", async () => {
        let logins = 0;

        mockAuthApi(async (): Promise<AxiosResponse<Session>> => {
            if (1 < ++logins) {
                throw new Error("testing");
            }

            return {
                data: {
                    jwt: TOKEN,
                },
            } as AxiosResponse;
        });

        const authenticator = await new AuthenticatorFactory(new UnauthenticatedApi()).create(LOGIN_REQUEST);

        expect(authenticator.getToken()).toEqual(TOKEN);
        expect(authenticator.getPayload()).toMatchObject(PAYLOAD);

        authenticator.refresh(100);

        await sleep(150);

        expect(() => authenticator.getToken()).toThrowError();
        expect(() => authenticator.getPayload()).toThrowError();
    });

    test("success on refresh", async () => {
        mockAuthApi(async (): Promise<AxiosResponse<Session>> => {
            return {
                data: {
                    jwt: TOKEN,
                }
            } as AxiosResponse;
        });

        const authenticator = await new AuthenticatorFactory(new UnauthenticatedApi()).create(LOGIN_REQUEST);

        expect(authenticator.getToken()).toEqual(TOKEN);
        expect(authenticator.getPayload()).toMatchObject(PAYLOAD);

        authenticator.refresh(100);

        await sleep(150);

        expect(authenticator.getToken()).toEqual(TOKEN);
        expect(authenticator.getPayload()).toMatchObject(PAYLOAD);
    });
});
