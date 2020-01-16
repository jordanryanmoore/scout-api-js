import { AuthApiFactory, GeneralApiFactory, AuthApi, GeneralApi } from "../src";

test("AuthApiFactory", async () => {
    const api = AuthApiFactory();

    expect(api).toHaveProperty("login");
});

test("GeneralApiFactory", async () => {
    const api = GeneralApiFactory();

    expect(api).toHaveProperty("getLocations");
});
