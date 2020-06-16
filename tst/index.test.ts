import { UnauthenticatedApi, AuthenticatedApi } from '../src';

test('UnauthenticatedApi', () => {
    const api = new UnauthenticatedApi();

    expect(api).toHaveProperty('login');
});

test('AuthenticatedApi', () => {
    const api = new AuthenticatedApi();

    expect(api).toHaveProperty('getLocations');
});
