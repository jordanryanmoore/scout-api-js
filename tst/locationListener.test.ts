import { ConnectionStateEvent, LocationListener, ConnectionState, Hub, ModeEvent, ModeState, RfidEvent, RfidEventType, DeviceAlarmEvent, DeviceEventType, DevicePairEvent, DeviceTriggerEvent } from "../src";
import { Authenticator } from "../src/authenticator";
import * as Pusher from "pusher-js";

const TOKEN = "token1";
const LOCATION_ID = "location1";
const CHANNEL_NAME = `private-${LOCATION_ID}`;

jest.mock("pusher-js");

describe("LocationListener", () => {
    const MockPusher = (Pusher as unknown as jest.Mock);
    let authenticator: Authenticator;
    let pusher: Pusher.Pusher;

    beforeEach(() => {
        authenticator = {
            getToken: () => TOKEN,
        } as Authenticator;

        pusher = {} as Pusher.Pusher;

        pusher.connection = {} as Pusher.ConnectionManager;

        pusher.connection.bind = jest.fn().mockImplementation((event: string, callback: Pusher.EventCallback): Pusher.ConnectionManager => {
            return pusher.connection;
        });

        pusher.bind = jest.fn().mockImplementation((event: string, callback: Pusher.EventCallback): Pusher.Pusher => {
            return pusher;
        });

        MockPusher.mockClear();
        MockPusher.mockImplementationOnce((apiKey: string, config: Pusher.Config) => {
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

    test("connectionStateListener", async () => {
        const expectedEvent: ConnectionStateEvent = {
            previous: ConnectionState.Connecting,
            current: ConnectionState.Connected,
        };

        const clientListener = jest.fn().mockImplementationOnce((event) => {
            return;
        });

        const locationListener = new LocationListener(authenticator);
        const connectionListener = (pusher.connection.bind as jest.Mock<Pusher.ConnectionManager>).mock.calls[0][1];

        locationListener.addConnectionStateListener(clientListener);

        connectionListener(expectedEvent);

        locationListener.removeConnectionStateListener(clientListener);

        connectionListener(expectedEvent);

        expect(pusher.connection.bind).toHaveBeenCalledTimes(1);
        expect(pusher.connection.bind).toHaveBeenCalledWith("state_change", connectionListener);

        expect(clientListener).toHaveBeenCalledTimes(1);
        expect(clientListener).toHaveBeenCalledWith(expectedEvent);
    });

    describe("location-based events", () => {
        let locationListener: LocationListener;
        let channel: Pusher.Channel;

        beforeEach(() => {
            locationListener = new LocationListener(authenticator);
            channel = {} as Pusher.Channel;

            pusher.channel = jest.fn().mockImplementationOnce((name: string): Pusher.Channel | undefined => {
                expect(name).toEqual(CHANNEL_NAME);

                return undefined;
            });

            pusher.subscribe = jest.fn().mockImplementationOnce((name: string): Pusher.Channel => {
                expect(name).toEqual(CHANNEL_NAME);

                return channel;
            });

            channel.bind = jest.fn().mockImplementation((eventName: string, callback: Pusher.EventCallback, context?: any) => {
                return channel;
            });
        });

        test("deviceAlarmEventListener", async () => {
            const expectedEvent = {
                // eslint-disable-next-line @typescript-eslint/camelcase
                device_id: "device1",
                event: DeviceEventType.Alarmed,
            } as DeviceAlarmEvent;

            const clientListener = jest.fn().mockImplementationOnce((event: DeviceAlarmEvent, locationId: string) => {
                return;
            });

            locationListener.addDeviceAlarmListener(LOCATION_ID, clientListener);

            const deviceListener = ((channel.bind as jest.Mock<Pusher.Channel>).mock.calls.find(call => call[0] == "device")[1]);

            deviceListener(expectedEvent);

            locationListener.removeDeviceAlarmListener(LOCATION_ID, clientListener);

            deviceListener(expectedEvent);

            expect(clientListener).toHaveBeenCalledTimes(1);
            expect(clientListener).toHaveBeenCalledWith(expectedEvent, LOCATION_ID);
        });

        test("devicePairEventListener", async () => {
            const expectedEvent = {
                id: "device1",
                event: DeviceEventType.Paired,
            } as DevicePairEvent;

            const clientListener = jest.fn().mockImplementationOnce((event: DevicePairEvent, locationId: string) => {
                return;
            });

            locationListener.addDevicePairListener(LOCATION_ID, clientListener);

            const deviceListener = ((channel.bind as jest.Mock<Pusher.Channel>).mock.calls.find(call => call[0] == "device")[1]);

            deviceListener(expectedEvent);

            locationListener.removeDevicePairListener(LOCATION_ID, clientListener);

            deviceListener(expectedEvent);

            expect(clientListener).toHaveBeenCalledTimes(1);
            expect(clientListener).toHaveBeenCalledWith(expectedEvent, LOCATION_ID);
        });

        test("deviceTriggerEventListener", async () => {
            const expectedEvent = {
                id: "device1",
                event: DeviceEventType.Triggered,
            } as DeviceTriggerEvent;

            const clientListener = jest.fn().mockImplementationOnce((event: DeviceTriggerEvent, locationId: string) => {
                return;
            });

            locationListener.addDeviceTriggerListener(LOCATION_ID, clientListener);

            const deviceListener = ((channel.bind as jest.Mock<Pusher.Channel>).mock.calls.find(call => call[0] == "device")[1]);

            deviceListener(expectedEvent);

            locationListener.removeDeviceTriggerListener(LOCATION_ID, clientListener);

            deviceListener(expectedEvent);

            expect(clientListener).toHaveBeenCalledTimes(1);
            expect(clientListener).toHaveBeenCalledWith(expectedEvent, LOCATION_ID);
        });

        test("hubEventListener", async () => {
            const expectedEvent = {
                id: "test",
            } as Hub;

            const clientListener = jest.fn().mockImplementationOnce((event: Hub, locationId: string) => {
                return;
            });

            locationListener.addHubListener(LOCATION_ID, clientListener);

            const hubListener = ((channel.bind as jest.Mock<Pusher.Channel>).mock.calls.find(call => call[0] == "hub")[1]);

            hubListener(expectedEvent);

            locationListener.removeHubListener(LOCATION_ID, clientListener);

            hubListener(expectedEvent);

            expect(clientListener).toHaveBeenCalledTimes(1);
            expect(clientListener).toHaveBeenCalledWith(expectedEvent, LOCATION_ID);
        });

        test("modeEventListener", async () => {
            const expectedEvent = {
                // eslint-disable-next-line @typescript-eslint/camelcase
                mode_id: "mode1",
                event: ModeState.Armed,
            } as ModeEvent;

            const clientListener = jest.fn().mockImplementationOnce((event: ModeEvent, locationId: string) => {
                return;
            });

            locationListener.addModeListener(LOCATION_ID, clientListener);

            const modeListener = ((channel.bind as jest.Mock<Pusher.Channel>).mock.calls.find(call => call[0] == "mode")[1]);

            modeListener(expectedEvent);

            locationListener.removeModeListener(LOCATION_ID, clientListener);

            modeListener(expectedEvent);

            expect(clientListener).toHaveBeenCalledTimes(1);
            expect(clientListener).toHaveBeenCalledWith(expectedEvent, LOCATION_ID);
        });

        test("rfidEventListener", async () => {
            const expectedEvent = {
                token: "rfid1",
                event: RfidEventType.Swiped,
            } as RfidEvent;

            const clientListener = jest.fn().mockImplementationOnce((event: RfidEvent, locationId: string) => {
                return;
            });

            locationListener.addRfidListener(LOCATION_ID, clientListener);

            const rfidListener = ((channel.bind as jest.Mock<Pusher.Channel>).mock.calls.find(call => call[0] == "rfid")[1]);

            rfidListener(expectedEvent);

            locationListener.removeRfidListener(LOCATION_ID, clientListener);

            rfidListener(expectedEvent);

            expect(clientListener).toHaveBeenCalledTimes(1);
            expect(clientListener).toHaveBeenCalledWith(expectedEvent, LOCATION_ID);
        });
    });
});
