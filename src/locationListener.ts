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
    // eslint-disable-next-line @typescript-eslint/no-shadow
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
    private connectionState: ConnectionState = ConnectionState.Disconnected;
    private pusher?: Pusher;

    // eslint-disable-next-line no-useless-constructor
    public constructor(private readonly authenticator: Authenticator) {}

    public getConnectionState(): ConnectionState {
        return this.connectionState;
    }

    public async connect(): Promise<void> {
        const auth = await this.getAuthConfig();

        if (this.pusher) {
            this.pusher.config.auth = auth;
            this.pusher.connect();
        } else {
            this.pusher = new Pusher(API_KEY, {
                authEndpoint: AUTH_ENDPOINT,
                auth,
            });

            this.pusher.connection.bind(CONNECTION_STATE_EVENT, (event: ConnectionStateEvent) => this.emitConnectionStateEvent(event));
        }
    }

    public disconnect(): void {
        this.pusher?.disconnect();
    }

    public addLocation(locationId: string): void {
        if (!this.pusher) {
            throw new Error('The listener is not connected, likely due to a missing call to connect().');
        }

        const channelName = `private-${locationId}`;
        let channel = this.pusher.channel(channelName);

        if (!channel) {
            channel = this.pusher.subscribe(channelName);
        }

        channel.bind(ScoutEventType.Device, (event: DeviceEvent) => this.emitDeviceEvent(event, locationId));
        channel.bind(ScoutEventType.Hub, (event: Hub) => this.emit(LocationEventType.Hub, event, locationId));
        channel.bind(ScoutEventType.Mode, (event: ModeEvent) => this.emit(LocationEventType.Mode, event, locationId));
        channel.bind(ScoutEventType.Rfid, (event: RfidEvent) => this.emit(LocationEventType.Rfid, event, locationId));
    }

    public removeLocation(locationId: string): void {
        if (!this.pusher) {
            throw new Error('The listener is not connected, likely due to a missing call to connect().');
        }

        const channelName = `private-${locationId}`;
        const channel = this.pusher.channel(channelName);

        if (channel) {
            this.pusher.unsubscribe(channelName);
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
