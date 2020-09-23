/* eslint-disable @typescript-eslint/unbound-method */
import Pusher from 'pusher-js';
import * as PusherTypes from 'pusher-js';
import {
    ConnectionStateEvent,
    LocationListener,
    ConnectionState,
    Hub,
    ModeEvent,
    ModeState,
    RfidEvent,
    RfidEventType,
    DeviceAlarmEvent,
    DeviceEventType,
    DevicePairEvent,
    DeviceTriggerEvent,
    LocationEventType,
} from '../src';
import { Authenticator } from '../src/authenticator';

const TOKEN = 'token1';
const LOCATION_ID = 'location1';
const CHANNEL_NAME = `private-${LOCATION_ID}`;

jest.mock('pusher-js');

describe('LocationListener', () => {
    const MockPusher = (Pusher as unknown) as jest.Mock;
    let authenticator: Authenticator;
    let pusher: Pusher;

    beforeEach(() => {
        authenticator = {
            getToken: (): Promise<string> => Promise.resolve(TOKEN),
        } as Authenticator;

        pusher = {} as Pusher;

        pusher.connection = {} as PusherTypes.ConnectionManager;

        pusher.connection.bind = jest.fn().mockImplementation(
            (): PusherTypes.ConnectionManager => {
                return pusher.connection;
            },
        );

        pusher.bind = jest.fn().mockImplementation(
            (): Pusher => {
                return pusher;
            },
        );

        MockPusher.mockClear();
        MockPusher.mockImplementationOnce((apiKey: string, config: PusherTypes.Options) => {
            expect(apiKey).toBeDefined();
            expect(config.authEndpoint).toBeDefined();
            expect(config.auth).toMatchObject({
                headers: {
                    Authorization: TOKEN,
                },
            });

            return pusher;
        });
    });

    test('getConnectionState()', async () => {
        const locationListener = new LocationListener(authenticator);

        expect(locationListener.getConnectionState()).toEqual(ConnectionState.Disconnected);

        await locationListener.connect();

        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const connectionListener = (pusher.connection.bind as jest.Mock<PusherTypes.ConnectionManager>).mock.calls[0][1] as (event: any) => void;

        connectionListener({
            previous: ConnectionState.Disconnected,
            current: ConnectionState.Connecting,
        });

        expect(locationListener.getConnectionState()).toEqual(ConnectionState.Connecting);
    });

    test('connect()', async () => {
        pusher.connect = jest.fn().mockImplementation();

        const locationListener = new LocationListener(authenticator);

        await locationListener.connect();

        const nextToken = 'token2';
        authenticator.getToken = (): Promise<string> => Promise.resolve(nextToken);
        (pusher.config as unknown) = {};

        await locationListener.connect();

        expect(pusher.connect).toBeCalledTimes(1);
        expect(pusher.config.auth).toMatchObject({
            headers: {
                Authorization: nextToken,
            },
        });
    });

    test('disconnect()', async () => {
        pusher.disconnect = jest.fn().mockImplementation();

        const locationListener = new LocationListener(authenticator);

        locationListener.disconnect();

        expect(pusher.disconnect).toBeCalledTimes(0);

        await locationListener.connect();
        locationListener.disconnect();

        expect(pusher.disconnect).toBeCalledTimes(1);
    });

    describe('on(…, …)', () => {
        let locationListener: LocationListener;
        let channel: PusherTypes.Channel;

        beforeEach(() => {
            locationListener = new LocationListener(authenticator);
            channel = {} as PusherTypes.Channel;

            pusher.channel = jest.fn().mockImplementationOnce((name: string): PusherTypes.Channel | undefined => {
                expect(name).toEqual(CHANNEL_NAME);

                return undefined;
            });

            pusher.subscribe = jest.fn().mockImplementationOnce(
                (name: string): PusherTypes.Channel => {
                    expect(name).toEqual(CHANNEL_NAME);

                    return channel;
                },
            );

            channel.bind = jest.fn().mockImplementation(() => {
                return channel;
            });
        });

        test('with ConnectionState event', async () => {
            const expectedEvent: ConnectionStateEvent = {
                previous: ConnectionState.Connecting,
                current: ConnectionState.Connected,
            };

            const clientListener = jest.fn().mockImplementationOnce(() => {
                return;
            });

            await locationListener.connect();

            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            const connectionListener = (pusher.connection.bind as jest.Mock<PusherTypes.ConnectionManager>).mock.calls[0][1] as (event: any) => void;

            locationListener.on(LocationEventType.ConnectionState, clientListener);

            connectionListener(expectedEvent);

            locationListener.off(LocationEventType.ConnectionState, clientListener);

            connectionListener(expectedEvent);

            expect(pusher.connection.bind).toHaveBeenCalledTimes(1);
            expect(pusher.connection.bind).toHaveBeenCalledWith('state_change', connectionListener);

            expect(clientListener).toHaveBeenCalledTimes(1);
            expect(clientListener).toHaveBeenCalledWith(expectedEvent);
        });

        test('with DeviceAlarm event', async () => {
            const expectedEvent = {
                device_id: 'device1',
                event: DeviceEventType.Alarmed,
            } as DeviceAlarmEvent;

            const clientListener = jest.fn().mockImplementationOnce(() => {
                return;
            });

            await locationListener.connect();
            locationListener.addLocation(LOCATION_ID);
            locationListener.on(LocationEventType.DeviceAlarm, clientListener);

            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            const deviceListener = (channel.bind as jest.Mock<PusherTypes.Channel>).mock.calls.find(call => call[0] === 'device')[1] as (event: any) => void;

            deviceListener(expectedEvent);

            locationListener.off(LocationEventType.DeviceAlarm, clientListener);

            deviceListener(expectedEvent);

            expect(clientListener).toHaveBeenCalledTimes(1);
            expect(clientListener).toHaveBeenCalledWith(expectedEvent, LOCATION_ID);
        });

        test('with DevicePair event', async () => {
            const expectedEvent = {
                id: 'device1',
                event: DeviceEventType.Paired,
            } as DevicePairEvent;

            const clientListener = jest.fn().mockImplementationOnce(() => {
                return;
            });

            await locationListener.connect();
            locationListener.addLocation(LOCATION_ID);
            locationListener.on(LocationEventType.DevicePair, clientListener);

            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            const deviceListener = (channel.bind as jest.Mock<PusherTypes.Channel>).mock.calls.find(call => call[0] === 'device')[1] as (event: any) => void;

            deviceListener(expectedEvent);

            locationListener.off(LocationEventType.DevicePair, clientListener);

            deviceListener(expectedEvent);

            expect(clientListener).toHaveBeenCalledTimes(1);
            expect(clientListener).toHaveBeenCalledWith(expectedEvent, LOCATION_ID);
        });

        test('with DeviceTrigger event', async () => {
            const expectedEvent = {
                id: 'device1',
                event: DeviceEventType.Triggered,
            } as DeviceTriggerEvent;

            const clientListener = jest.fn().mockImplementationOnce(() => {
                return;
            });

            await locationListener.connect();
            locationListener.addLocation(LOCATION_ID);
            locationListener.on(LocationEventType.DeviceTrigger, clientListener);

            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            const deviceListener = (channel.bind as jest.Mock<PusherTypes.Channel>).mock.calls.find(call => call[0] === 'device')[1] as (event: any) => void;

            deviceListener(expectedEvent);

            locationListener.off(LocationEventType.DeviceTrigger, clientListener);

            deviceListener(expectedEvent);

            expect(clientListener).toHaveBeenCalledTimes(1);
            expect(clientListener).toHaveBeenCalledWith(expectedEvent, LOCATION_ID);
        });

        test('with Hub event', async () => {
            const expectedEvent = {
                id: 'test',
            } as Hub;

            const clientListener = jest.fn().mockImplementationOnce(() => {
                return;
            });

            await locationListener.connect();
            locationListener.addLocation(LOCATION_ID);
            locationListener.on(LocationEventType.Hub, clientListener);

            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            const hubListener = (channel.bind as jest.Mock<PusherTypes.Channel>).mock.calls.find(call => call[0] === 'hub')[1] as (event: any) => void;

            hubListener(expectedEvent);

            locationListener.off(LocationEventType.Hub, clientListener);

            hubListener(expectedEvent);

            expect(clientListener).toHaveBeenCalledTimes(1);
            expect(clientListener).toHaveBeenCalledWith(expectedEvent, LOCATION_ID);
        });

        test('with Mode event', async () => {
            const expectedEvent = {
                mode_id: 'mode1',
                event: ModeState.Armed,
            } as ModeEvent;

            const clientListener = jest.fn().mockImplementationOnce(() => {
                return;
            });

            await locationListener.connect();
            locationListener.addLocation(LOCATION_ID);
            locationListener.on(LocationEventType.Mode, clientListener);

            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            const modeListener = (channel.bind as jest.Mock<PusherTypes.Channel>).mock.calls.find(call => call[0] === 'mode')[1] as (event: any) => void;

            modeListener(expectedEvent);

            locationListener.off(LocationEventType.Mode, clientListener);

            modeListener(expectedEvent);

            expect(clientListener).toHaveBeenCalledTimes(1);
            expect(clientListener).toHaveBeenCalledWith(expectedEvent, LOCATION_ID);
        });

        test('with Rfid event', async () => {
            const expectedEvent = {
                token: 'rfid1',
                event: RfidEventType.Swiped,
            } as RfidEvent;

            const clientListener = jest.fn().mockImplementationOnce(() => {
                return;
            });

            await locationListener.connect();
            locationListener.addLocation(LOCATION_ID);
            locationListener.on(LocationEventType.Rfid, clientListener);

            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            const rfidListener = (channel.bind as jest.Mock<PusherTypes.Channel>).mock.calls.find(call => call[0] === 'rfid')[1] as (event: any) => void;

            rfidListener(expectedEvent);

            locationListener.off(LocationEventType.Rfid, clientListener);

            rfidListener(expectedEvent);

            expect(clientListener).toHaveBeenCalledTimes(1);
            expect(clientListener).toHaveBeenCalledWith(expectedEvent, LOCATION_ID);
        });
    });
});
