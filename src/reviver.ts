export class Reviver {
    public revive(key: any, value: any): any {
        if ("string" === typeof value) {
            if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d*)?Z$/.test(value)) {
                return new Date(value);
            }
        }

        if ("number" === typeof value) {
            if ("heartbeat" === key) {
                return new Date(value);
            }
        }

        return value;
    }
}
