import { UnauthenticatedApi, AuthenticatedApi } from "../src";

test("UnauthenticatedApi", async () => {
    const api = new UnauthenticatedApi();

    expect(api).toHaveProperty("login");
});

test("AuthenticatedApi", async () => {
    const api = new AuthenticatedApi();

    expect(api).toHaveProperty("getLocations");
});
