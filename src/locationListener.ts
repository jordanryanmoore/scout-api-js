import { DeviceAlarmEvent, EventType, DeviceEventType, ModeEvent, Hub, RfidEvent, DeviceTriggerEvent, DevicePairEvent, DeviceEvent } from "../generated-src";
import { BASE_PATH } from "../generated-src/base";
import { Authenticator } from "./authenticator";
import { EventEmitter } from "events";
import * as Pusher from "pusher-js";

const API_KEY = "baf06f5a867d462e09d4";
const AUTH_ENDPOINT = BASE_PATH + "/auth/pusher";
const CONNECTION_STATE_EVENT = "state_change";

type EventListener<T> = (event: T, locationId: string) => void;

enum ListenerType {
    ConnectionState = "connection_state",
    DeviceAlarm = "device_alarm",
    DevicePair = "device_pair",
    DeviceTrigger = "device_trigger",
    Hub = "hub",
    Mode = "mode",
    Rfid = "rfid",
}

export enum ConnectionState {
    Connecting = "connecting",
    Connected = "connected",
    Disconnected = "disconnected",
    Failed = "failed",
    Unavailable = "unavailable",
}

export interface ConnectionStateEvent {
    previous: ConnectionState;
    current: ConnectionState;
}

export class LocationListener {
    private readonly eventEmitter = new EventEmitter();
    private readonly pusher: Pusher.Pusher;

    public constructor(authenticator: Authenticator) {
        this.pusher = new Pusher(API_KEY, {
            authEndpoint: AUTH_ENDPOINT,
            auth: {
                headers: {
                    Authorization: authenticator.getToken(),
                },
            },
        });

        this.pusher.connection.bind(CONNECTION_STATE_EVENT, event => this.emitConnectionStateEvent(event));
    }

    public connect(): void {
        this.pusher.connect();
    }

    public disconnect(): void {
        this.pusher.disconnect();
    }

    public addConnectionStateListener(listener: EventListener<ConnectionStateEvent>): void {
        this.eventEmitter.addListener(ListenerType.ConnectionState, listener);
    }

    public removeConnectionStateListener(listener: EventListener<ConnectionStateEvent>): void {
        this.eventEmitter.removeListener(ListenerType.ConnectionState, listener);
    }

    public addDeviceAlarmListener(locationId: string, listener: EventListener<DeviceAlarmEvent>): void {
        this.addLocationListener(locationId, ListenerType.DeviceAlarm, listener);
    }

    public removeDeviceAlarmListener(locationId: string, listener: EventListener<DeviceAlarmEvent>): void {
        this.removeLocationListener(locationId, ListenerType.DeviceAlarm, listener);
    }

    public addDevicePairListener(locationId: string, listener: EventListener<DevicePairEvent>): void {
        this.addLocationListener(locationId, ListenerType.DevicePair, listener);
    }

    public removeDevicePairListener(locationId: string, listener: EventListener<DevicePairEvent>): void {
        this.removeLocationListener(locationId, ListenerType.DevicePair, listener);
    }

    public addDeviceTriggerListener(locationId: string, listener: EventListener<DeviceTriggerEvent>): void {
        this.addLocationListener(locationId, ListenerType.DeviceTrigger, listener);
    }

    public removeDeviceTriggerListener(locationId: string, listener: EventListener<DeviceTriggerEvent>): void {
        this.removeLocationListener(locationId, ListenerType.DeviceTrigger, listener);
    }

    public addHubListener(locationId: string, listener: EventListener<Hub>): void {
        this.addLocationListener(locationId, ListenerType.Hub, listener);
    }

    public removeHubListener(locationId: string, listener: EventListener<Hub>): void {
        this.removeLocationListener(locationId, ListenerType.Hub, listener);
    }

    public addModeListener(locationId: string, listener: EventListener<ModeEvent>): void {
        this.addLocationListener(locationId, ListenerType.Mode, listener);
    }

    public removeModeListener(locationId: string, listener: EventListener<ModeEvent>): void {
        this.removeLocationListener(locationId, ListenerType.Mode, listener);
    }

    public addRfidListener(locationId: string, listener: EventListener<RfidEvent>): void {
        this.addLocationListener(locationId, ListenerType.Rfid, listener);
    }

    public removeRfidListener(locationId: string, listener: EventListener<RfidEvent>): void {
        this.removeLocationListener(locationId, ListenerType.Rfid, listener);
    }

    private addLocationListener<T>(locationId: string, type: ListenerType, listener: EventListener<T>): void {
        const channelName = `private-${locationId}`;
        let channel = this.pusher.channel(channelName);

        if (!channel) {
            channel = this.pusher.subscribe(channelName);

            channel.bind(EventType.Device, event => this.emitDeviceEvent(locationId, event));
            channel.bind(EventType.Hub, event => this.emit(locationId, ListenerType.Hub, event));
            channel.bind(EventType.Mode, event => this.emit(locationId, ListenerType.Mode, event));
            channel.bind(EventType.Rfid, event => this.emit(locationId, ListenerType.Rfid, event));
        }

        this.eventEmitter.addListener(`${locationId}:${type}`, listener);
    }

    private removeLocationListener<T>(locationId: string, type: ListenerType, listener: EventListener<T>): void {
        this.eventEmitter.removeListener(`${locationId}:${type}`, listener);

        // TODO: Unsubscribe from the channel if there are no more listeners.
    }

    private emitConnectionStateEvent(event: ConnectionStateEvent): void {
        this.eventEmitter.emit(ListenerType.ConnectionState, event);
    }

    private emitDeviceEvent(locationId: string, event: {event: DeviceEventType}): void {
        switch (event.event) {
            case DeviceEventType.Alarmed:
            case DeviceEventType.Dismissed:
                this.emit(locationId, ListenerType.DeviceAlarm, event);
                break;
            case DeviceEventType.Paired:
            case DeviceEventType.Unpaired:
                this.emit(locationId, ListenerType.DevicePair, event);
                break;
            case DeviceEventType.Triggered:
                this.emit(locationId, ListenerType.DeviceTrigger, event);
                break;
        }
    }

    private emit(locationId: string, type: ListenerType, event: DeviceEvent | Hub | ModeEvent | RfidEvent): void {
        this.eventEmitter.emit(`${locationId}:${type}`, event, locationId);
    }
}
