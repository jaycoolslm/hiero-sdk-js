import { AccountBalanceQuery } from "../../src/exports.js";
import IntegrationTestEnv, {
    Client,
} from "./client/NodeIntegrationTestEnv.js";
import { createFungibleToken } from "./utils/Fixtures.js";

describe("AccountBalanceQuery", function () {
    let clientPreviewNet;
    let clientTestnet;
    let env;

    beforeAll(async function () {
        clientPreviewNet = Client.forPreviewnet();
        clientTestnet = Client.forTestnet();
        env = await IntegrationTestEnv.new({ throwaway: true });
    });

    it("can query balance of node 0.0.3", async function () {
        const balance = await new AccountBalanceQuery()
            .setAccountId("0.0.3")
            .execute(clientTestnet);
        expect(balance.hbars.toTinybars().compare(0)).to.be.equal(1);
    });

    it("can query balances on previewnet", async function () {
        const balance = await new AccountBalanceQuery()
            .setAccountId("0.0.3")
            .setMaxAttempts(10)
            .execute(clientPreviewNet);
        expect(balance.hbars.toTinybars().compare(0)).to.be.equal(1);
    });

    it("can query balances on testnet", async function () {
        const balance = await new AccountBalanceQuery()
            .setAccountId("0.0.3")
            .setMaxAttempts(10)
            .execute(clientTestnet);
        expect(balance.hbars.toTinybars().compare(0)).to.be.equal(1);
    });

    it("an account that does not exist should return an error", async function () {
        let err = false;

        try {
            await new AccountBalanceQuery()
                .setAccountId("1.0.3")
                .execute(env.client);
        } catch (error) {
            err = error.toString().includes("does not exist");
        }

        if (!err) {
            throw new Error("query did not error");
        }
    });

    it("should reflect token with no keys", async function () {
        const tokenId = await createFungibleToken(env.client, (transaction) => {
            transaction.setInitialSupply(0);
        });

        const balances = await new AccountBalanceQuery()
            .setAccountId(env.operatorId)
            .execute(env.client);

        expect(balances.tokens.get(tokenId.toString()).toInt()).to.be.equal(0);
    });

    afterAll(async function () {
        clientPreviewNet.close();
        clientTestnet.close();
        await env.close();
    });
});
