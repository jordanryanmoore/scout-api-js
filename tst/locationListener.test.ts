import { ConnectionStateEvent, LocationListener, ConnectionState, Hub, ModeEvent, ModeState, RfidEvent, RfidEventType, DeviceAlarmEvent, DeviceEventType, DevicePairEvent, DeviceTriggerEvent } from "../src";
import { Authenticator } from "../src/authenticator";
import Pusher from "pusher-js";
import * as PusherTypes from "pusher-js";

const TOKEN = "token1";
const LOCATION_ID = "location1";
const CHANNEL_NAME = `private-${LOCATION_ID}`;

jest.mock("pusher-js");

describe("LocationListener", () => {
    const MockPusher = (Pusher as unknown as jest.Mock);
    let authenticator: Authenticator;
    let pusher: Pusher;

    beforeEach(() => {
        authenticator = {
            getToken: () => TOKEN,
        } as Authenticator;

        pusher = {} as Pusher;

        pusher.connection = {} as PusherTypes.ConnectionManager;

        pusher.connection.bind = jest.fn().mockImplementation((event: string, callback: Function): PusherTypes.ConnectionManager => {
            return pusher.connection;
        });

        pusher.bind = jest.fn().mockImplementation((event: string, callback: Function): Pusher => {
            return pusher;
        });

        MockPusher.mockClear();
        MockPusher.mockImplementationOnce((apiKey: string, config: PusherTypes.Options) => {
            expect(apiKey).toBeDefined();
            expect(config.authEndpoint).toBeDefined();
            expect(config.auth).toMatchObject({
                headers: {
                    Authorization: TOKEN,
                }
            });

            return pusher;
        });
    });

    test("getConnectionState()", () => {
        pusher.connection.state = ConnectionState.Connecting;

        const locationListener = new LocationListener(authenticator);

        expect(locationListener.getConnectionState()).toEqual(ConnectionState.Connecting);
    });

    test("connect()", () => {
        const nextToken = "token2";

        pusher.connect = jest.fn().mockImplementation();
        (pusher.config as unknown) = {};

        const locationListener = new LocationListener(authenticator);

        authenticator.getToken = (): string => nextToken;

        locationListener.connect();

        expect(pusher.connect).toBeCalledTimes(1);
        expect(pusher.config.auth).toMatchObject({
            headers: {
                Authorization: nextToken,
            }
        });
    });

    test("disconnect()", () => {
        pusher.disconnect = jest.fn().mockImplementation();

        const locationListener = new LocationListener(authenticator);

        locationListener.disconnect();

        expect(pusher.disconnect).toBeCalledTimes(1);
    });

    test("*ConnectionStateListener()", async () => {
        const expectedEvent: ConnectionStateEvent = {
            previous: ConnectionState.Connecting,
            current: ConnectionState.Connected,
        };

        const clientListener = jest.fn().mockImplementationOnce((event) => {
            return;
        });

        const locationListener = new LocationListener(authenticator);
        const connectionListener = (pusher.connection.bind as jest.Mock<PusherTypes.ConnectionManager>).mock.calls[0][1];

        locationListener.addConnectionStateListener(clientListener);

        connectionListener(expectedEvent);

        locationListener.removeConnectionStateListener(clientListener);

        connectionListener(expectedEvent);

        expect(pusher.connection.bind).toHaveBeenCalledTimes(1);
        expect(pusher.connection.bind).toHaveBeenCalledWith("state_change", connectionListener);

        expect(clientListener).toHaveBeenCalledTimes(1);
        expect(clientListener).toHaveBeenCalledWith(expectedEvent);
    });

    describe("Location-Based Events", () => {
        let locationListener: LocationListener;
        let channel: PusherTypes.Channel;

        beforeEach(() => {
            locationListener = new LocationListener(authenticator);
            channel = {} as PusherTypes.Channel;

            pusher.channel = jest.fn().mockImplementationOnce((name: string): PusherTypes.Channel | undefined => {
                expect(name).toEqual(CHANNEL_NAME);

                return undefined;
            });

            pusher.subscribe = jest.fn().mockImplementationOnce((name: string): PusherTypes.Channel => {
                expect(name).toEqual(CHANNEL_NAME);

                return channel;
            });

            channel.bind = jest.fn().mockImplementation((eventName: string, callback: Function, context?: any) => {
                return channel;
            });
        });

        test("*DeviceAlarmEventListener()", async () => {
            const expectedEvent = {
                // eslint-disable-next-line @typescript-eslint/camelcase
                device_id: "device1",
                event: DeviceEventType.Alarmed,
            } as DeviceAlarmEvent;

            const clientListener = jest.fn().mockImplementationOnce((event: DeviceAlarmEvent, locationId: string) => {
                return;
            });

            locationListener.addDeviceAlarmListener(LOCATION_ID, clientListener);

            const deviceListener = ((channel.bind as jest.Mock<PusherTypes.Channel>).mock.calls.find(call => call[0] == "device")[1]);

            deviceListener(expectedEvent);

            locationListener.removeDeviceAlarmListener(LOCATION_ID, clientListener);

            deviceListener(expectedEvent);

            expect(clientListener).toHaveBeenCalledTimes(1);
            expect(clientListener).toHaveBeenCalledWith(expectedEvent, LOCATION_ID);
        });

        test("*DevicePairEventListener()", async () => {
            const expectedEvent = {
                id: "device1",
                event: DeviceEventType.Paired,
            } as DevicePairEvent;

            const clientListener = jest.fn().mockImplementationOnce((event: DevicePairEvent, locationId: string) => {
                return;
            });

            locationListener.addDevicePairListener(LOCATION_ID, clientListener);

            const deviceListener = ((channel.bind as jest.Mock<PusherTypes.Channel>).mock.calls.find(call => call[0] == "device")[1]);

            deviceListener(expectedEvent);

            locationListener.removeDevicePairListener(LOCATION_ID, clientListener);

            deviceListener(expectedEvent);

            expect(clientListener).toHaveBeenCalledTimes(1);
            expect(clientListener).toHaveBeenCalledWith(expectedEvent, LOCATION_ID);
        });

        test("*DeviceTriggerEventListener()", async () => {
            const expectedEvent = {
                id: "device1",
                event: DeviceEventType.Triggered,
            } as DeviceTriggerEvent;

            const clientListener = jest.fn().mockImplementationOnce((event: DeviceTriggerEvent, locationId: string) => {
                return;
            });

            locationListener.addDeviceTriggerListener(LOCATION_ID, clientListener);

            const deviceListener = ((channel.bind as jest.Mock<PusherTypes.Channel>).mock.calls.find(call => call[0] == "device")[1]);

            deviceListener(expectedEvent);

            locationListener.removeDeviceTriggerListener(LOCATION_ID, clientListener);

            deviceListener(expectedEvent);

            expect(clientListener).toHaveBeenCalledTimes(1);
            expect(clientListener).toHaveBeenCalledWith(expectedEvent, LOCATION_ID);
        });

        test("*HubEventListener()", async () => {
            const expectedEvent = {
                id: "test",
            } as Hub;

            const clientListener = jest.fn().mockImplementationOnce((event: Hub, locationId: string) => {
                return;
            });

            locationListener.addHubListener(LOCATION_ID, clientListener);

            const hubListener = ((channel.bind as jest.Mock<PusherTypes.Channel>).mock.calls.find(call => call[0] == "hub")[1]);

            hubListener(expectedEvent);

            locationListener.removeHubListener(LOCATION_ID, clientListener);

            hubListener(expectedEvent);

            expect(clientListener).toHaveBeenCalledTimes(1);
            expect(clientListener).toHaveBeenCalledWith(expectedEvent, LOCATION_ID);
        });

        test("*ModeEventListener()", async () => {
            const expectedEvent = {
                // eslint-disable-next-line @typescript-eslint/camelcase
                mode_id: "mode1",
                event: ModeState.Armed,
            } as ModeEvent;

            const clientListener = jest.fn().mockImplementationOnce((event: ModeEvent, locationId: string) => {
                return;
            });

            locationListener.addModeListener(LOCATION_ID, clientListener);

            const modeListener = ((channel.bind as jest.Mock<PusherTypes.Channel>).mock.calls.find(call => call[0] == "mode")[1]);

            modeListener(expectedEvent);

            locationListener.removeModeListener(LOCATION_ID, clientListener);

            modeListener(expectedEvent);

            expect(clientListener).toHaveBeenCalledTimes(1);
            expect(clientListener).toHaveBeenCalledWith(expectedEvent, LOCATION_ID);
        });

        test("*RfidEventListener()", async () => {
            const expectedEvent = {
                token: "rfid1",
                event: RfidEventType.Swiped,
            } as RfidEvent;

            const clientListener = jest.fn().mockImplementationOnce((event: RfidEvent, locationId: string) => {
                return;
            });

            locationListener.addRfidListener(LOCATION_ID, clientListener);

            const rfidListener = ((channel.bind as jest.Mock<PusherTypes.Channel>).mock.calls.find(call => call[0] == "rfid")[1]);

            rfidListener(expectedEvent);

            locationListener.removeRfidListener(LOCATION_ID, clientListener);

            rfidListener(expectedEvent);

            expect(clientListener).toHaveBeenCalledTimes(1);
            expect(clientListener).toHaveBeenCalledWith(expectedEvent, LOCATION_ID);
        });
    });
});
