import { AuthenticatorFactory, MembersApi } from "../src";
import { config as configDotEnv } from "dotenv";

configDotEnv();

test("MembersApi.findMember()", async () => {
    const email = process.env.SCOUT_EMAIL as string;
    const password = process.env.SCOUT_PASSWORD as string;
    const authenticator = await new AuthenticatorFactory().create({
        email,
        password,
    });

    const memberId = authenticator.getPayload().id;
    const membersApi = new MembersApi({
        apiKey: (): string => authenticator.getToken(),
    });

    expect((await membersApi.findMember(email)).data.member_id).toEqual(memberId);
});
