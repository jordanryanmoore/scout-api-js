import { AuthenticatorFactory, LocationListener, ConnectionState } from "../src";
import { config as configDotEnv } from "dotenv";

configDotEnv();

test("LocationListener", async () => {
    const email = process.env.SCOUT_EMAIL as string;
    const password = process.env.SCOUT_PASSWORD as string;
    const authenticator = await new AuthenticatorFactory().create({
        email,
        password,
    });

    const locationListener = new LocationListener(authenticator);

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
