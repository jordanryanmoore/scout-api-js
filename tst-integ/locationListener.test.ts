import { config as configDotEnv } from 'dotenv';
import { AuthenticatorFactory, LocationListener, ConnectionState, Authenticator, LocationEventType } from '../src';

configDotEnv();

describe('LocationListener', () => {
    let authenticator: Authenticator;
    let locationListener: LocationListener;

    beforeAll(() => {
        const email = process.env.SCOUT_EMAIL as string;
        const password = process.env.SCOUT_PASSWORD as string;

        authenticator = new AuthenticatorFactory().create({
            email,
            password,
        });
    });

    beforeEach(() => {
        locationListener = new LocationListener(authenticator);
    });

    test('on(ConnectionState)', async () => {
        const result = new Promise((resolve, reject) => {
            locationListener.on(LocationEventType.ConnectionState, event => {
                try {
                    expect(event.previous).toEqual(ConnectionState.Connecting);
                    expect(event.current).toEqual(ConnectionState.Connected);

                    resolve();
                } catch (e) {
                    reject(e);
                }
            });
        });

        await locationListener.connect();

        return result;
    });

    afterEach(() => {
        if (locationListener) {
            locationListener.disconnect();
        }
    });
});
