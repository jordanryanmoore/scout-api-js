import { config as configDotEnv } from 'dotenv';
import { AuthenticatorFactory, MembersApi, Configuration } from '../src';

configDotEnv();

test('MembersApi.findMember()', async () => {
    const email = process.env.SCOUT_EMAIL as string;
    const password = process.env.SCOUT_PASSWORD as string;
    const authenticator = new AuthenticatorFactory().create({
        email,
        password,
    });

    const memberId = (await authenticator.getPayload()).id;
    const membersApi = new MembersApi(
        new Configuration({
            apiKey: (): Promise<string> => authenticator.getToken(),
        }),
    );

    expect((await membersApi.findMember(email)).data.member_id).toEqual(memberId);
});
