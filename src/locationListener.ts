import { EventEmitter } from 'events';
import * as PusherTypes from 'pusher-js';
import Pusher from 'pusher-js';
import {
    DeviceAlarmEvent,
    EventType as ScoutEventType,
    DeviceEventType,
    ModeEvent,
    Hub,
    RfidEvent,
    DeviceTriggerEvent,
    DevicePairEvent,
    DeviceEvent,
} from '../generated-src';
import { BASE_PATH } from '../generated-src/base';
import { Authenticator } from './authenticator';

const API_KEY = 'baf06f5a867d462e09d4';
const AUTH_ENDPOINT = BASE_PATH + '/auth/pusher';
const CONNECTION_STATE_EVENT = 'state_change';

type EventListener<T> = (event: T) => void;

type LocationEventListener<T> = (event: T, locationId: string) => void;

export enum LocationEventType {
    ConnectionState = 'connection_state',
    DeviceAlarm = 'device_alarm',
    DevicePair = 'device_pair',
    DeviceTrigger = 'device_trigger',
    // eslint-disable-next-line no-shadow
    Hub = 'hub',
    Mode = 'mode',
    Rfid = 'rfid',
}

export enum ConnectionState {
    Connecting = 'connecting',
    Connected = 'connected',
    Disconnected = 'disconnected',
    Failed = 'failed',
    Unavailable = 'unavailable',
}

export interface ConnectionStateEvent {
    previous: ConnectionState;
    current: ConnectionState;
}

export class LocationListener {
    private readonly eventEmitter = new EventEmitter();
    private readonly pusher: Promise<Pusher>;
    private connectionState: ConnectionState = ConnectionState.Unavailable;

    public constructor(private readonly authenticator: Authenticator) {
        this.pusher = this.getPusher();
    }

    public getConnectionState(): ConnectionState {
        return this.connectionState;
    }

    public async connect(): Promise<void> {
        const pusher = await this.pusher;
        pusher.config.auth = await this.getAuthConfig();
        pusher.connect();
    }

    public async disconnect(): Promise<void> {
        (await this.pusher).disconnect();
    }

    public async addLocation(locationId: string): Promise<void> {
        const pusher = await this.pusher;
        const channelName = `private-${locationId}`;
        let channel = pusher.channel(channelName);

        if (!channel) {
            channel = pusher.subscribe(channelName);
        }

        channel.bind(ScoutEventType.Device, (event: DeviceEvent) => this.emitDeviceEvent(event, locationId));
        channel.bind(ScoutEventType.Hub, (event: Hub) => this.emit(LocationEventType.Hub, event, locationId));
        channel.bind(ScoutEventType.Mode, (event: ModeEvent) => this.emit(LocationEventType.Mode, event, locationId));
        channel.bind(ScoutEventType.Rfid, (event: RfidEvent) => this.emit(LocationEventType.Rfid, event, locationId));
    }

    public async removeLocation(locationId: string): Promise<void> {
        const pusher = await this.pusher;
        const channelName = `private-${locationId}`;
        const channel = pusher.channel(channelName);

        if (channel) {
            pusher.unsubscribe(channelName);
        }
    }

    public on(eventType: LocationEventType.ConnectionState, listener: EventListener<ConnectionStateEvent>): void;
    public on(eventType: LocationEventType.DeviceAlarm, listener: LocationEventListener<DeviceAlarmEvent>): void;
    public on(eventType: LocationEventType.DevicePair, listener: LocationEventListener<DevicePairEvent>): void;
    public on(eventType: LocationEventType.DeviceTrigger, listener: LocationEventListener<DeviceTriggerEvent>): void;
    public on(eventType: LocationEventType.Hub, listener: LocationEventListener<Hub>): void;
    public on(eventType: LocationEventType.Mode, listener: LocationEventListener<ModeEvent>): void;
    public on(eventType: LocationEventType.Rfid, listener: LocationEventListener<RfidEvent>): void;
    public on(eventType: string, listener: LocationEventListener<any>): void {
        this.eventEmitter.on(eventType, listener);
    }

    public off(eventType: LocationEventType.ConnectionState, listener: EventListener<ConnectionStateEvent>): void;
    public off(eventType: LocationEventType.DeviceAlarm, listener: LocationEventListener<DeviceAlarmEvent>): void;
    public off(eventType: LocationEventType.DevicePair, listener: LocationEventListener<DevicePairEvent>): void;
    public off(eventType: LocationEventType.DeviceTrigger, listener: LocationEventListener<DeviceTriggerEvent>): void;
    public off(eventType: LocationEventType.Hub, listener: LocationEventListener<Hub>): void;
    public off(eventType: LocationEventType.Mode, listener: LocationEventListener<ModeEvent>): void;
    public off(eventType: LocationEventType.Rfid, listener: LocationEventListener<RfidEvent>): void;
    public off(eventType: string, listener: LocationEventListener<any>): void {
        this.eventEmitter.off(eventType, listener);
    }

    private async getPusher(): Promise<Pusher> {
        const pusher = new Pusher(API_KEY, {
            authEndpoint: AUTH_ENDPOINT,
            auth: await this.getAuthConfig(),
        });

        this.pusher.connection.bind(CONNECTION_STATE_EVENT, (event: ConnectionStateEvent) => this.emitConnectionStateEvent(event));

        return pusher;
    }

    private async getAuthConfig(): Promise<PusherTypes.AuthOptions> {
        return {
            headers: {
                Authorization: await this.authenticator.getToken(),
            },
        };
    }

    private emitConnectionStateEvent(event: ConnectionStateEvent): void {
        this.connectionState = event.current;
        this.eventEmitter.emit(LocationEventType.ConnectionState, event);
    }

    private emitDeviceEvent(event: { event: DeviceEventType }, locationId: string): void {
        switch (event.event) {
            case DeviceEventType.Alarmed:
            case DeviceEventType.Dismissed:
                this.emit(LocationEventType.DeviceAlarm, event, locationId);
                break;
            case DeviceEventType.Paired:
            case DeviceEventType.Unpaired:
                this.emit(LocationEventType.DevicePair, event, locationId);
                break;
            case DeviceEventType.Triggered:
                this.emit(LocationEventType.DeviceTrigger, event, locationId);
                break;
        }
    }

    private emit(type: LocationEventType, event: DeviceEvent | Hub | ModeEvent | RfidEvent, locationId: string): void {
        this.eventEmitter.emit(type, event, locationId);
    }
}
