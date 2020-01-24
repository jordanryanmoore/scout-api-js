import { AuthenticatorFactory, LocationListener, ConnectionState, Authenticator } from "../src";
import { config as configDotEnv } from "dotenv";

configDotEnv();

describe("LocationListener", () => {
    let authenticator: Authenticator;
    let locationListener: LocationListener;

    beforeAll(async () => {
        const email = process.env.SCOUT_EMAIL as string;
        const password = process.env.SCOUT_PASSWORD as string;

        authenticator = await new AuthenticatorFactory().create({
            email,
            password,
        });
    });

    beforeEach(() => {
        locationListener = new LocationListener(authenticator);
    });

    test("*ConnectionStateListener()", async () => {
        return new Promise((resolve, reject) => {
            locationListener.addConnectionStateListener(event => {
                try {
                    expect(event.previous).toEqual(ConnectionState.Connecting);
                    expect(event.current).toEqual(ConnectionState.Connected);

                    resolve();
                } catch (e) {
                    reject(e);
                }
            });
        });
    });

    afterEach(() => {
        if (locationListener) {
            locationListener.disconnect();
        }
    });
});
