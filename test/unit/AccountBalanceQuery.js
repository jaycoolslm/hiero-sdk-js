import {
    AccountBalanceQuery,
    AccountBalance,
    AccountId,
    ContractId,
    Hbar,
} from "../../src/exports.js";

describe("AccountBalanceQuery", function () {
    describe("setters and getters", function () {
        it("should set and get account ID", function () {
            const query = new AccountBalanceQuery().setAccountId("0.0.3");
            expect(query.accountId.toString()).to.be.equal("0.0.3");
        });

        it("should set and get contract ID", function () {
            const query = new AccountBalanceQuery().setContractId("0.0.100");
            expect(query.contractId.toString()).to.be.equal("0.0.100");
        });

        it("should accept constructor props", function () {
            const query = new AccountBalanceQuery({
                accountId: "0.0.5",
            });
            expect(query.accountId.toString()).to.be.equal("0.0.5");
        });

        it("should accept AccountId objects", function () {
            const accountId = new AccountId(10);
            const query = new AccountBalanceQuery().setAccountId(accountId);
            expect(query.accountId.toString()).to.be.equal("0.0.10");
        });

        it("should accept ContractId objects", function () {
            const contractId = new ContractId(50);
            const query = new AccountBalanceQuery().setContractId(contractId);
            expect(query.contractId.toString()).to.be.equal("0.0.50");
        });
    });

    describe("getCost", function () {
        it("should return Hbar(0)", async function () {
            const query = new AccountBalanceQuery();
            const cost = await query.getCost();
            expect(cost.toTinybars().toInt()).to.be.equal(0);
        });
    });

    describe("no-op stubs", function () {
        it("setNodeAccountIds should return this", function () {
            const query = new AccountBalanceQuery();
            const result = query.setNodeAccountIds([new AccountId(3)]);
            expect(result).to.equal(query);
        });

        it("setQueryPayment should return this", function () {
            const query = new AccountBalanceQuery();
            const result = query.setQueryPayment(new Hbar(1));
            expect(result).to.equal(query);
        });

        it("setMaxQueryPayment should return this", function () {
            const query = new AccountBalanceQuery();
            const result = query.setMaxQueryPayment(new Hbar(1));
            expect(result).to.equal(query);
        });

        it("setGrpcDeadline should return this", function () {
            const query = new AccountBalanceQuery();
            const result = query.setGrpcDeadline(5000);
            expect(result).to.equal(query);
        });
    });

    describe("retry configuration", function () {
        it("should set max attempts", function () {
            const query = new AccountBalanceQuery().setMaxAttempts(5);
            expect(query._maxAttempts).to.be.equal(5);
        });

        it("should set min backoff", function () {
            const query = new AccountBalanceQuery().setMinBackoff(500);
            expect(query._minBackoff).to.be.equal(500);
        });

        it("should set max backoff", function () {
            const query = new AccountBalanceQuery().setMaxBackoff(16000);
            expect(query._maxBackoff).to.be.equal(16000);
        });
    });

    describe("execute validation", function () {
        it("should throw if no account or contract ID set", async function () {
            const query = new AccountBalanceQuery();
            let err = false;
            try {
                await query.execute(/** @type {any} */ ({}));
            } catch (error) {
                err = error.message.includes(
                    "either account ID or contract ID must be set",
                );
            }
            expect(err).to.be.true;
        });
    });

    describe("_fromMirrorNodeResponse", function () {
        it("should parse hbar-only response", function () {
            const data = {
                balance: {
                    balance: 500000000,
                    tokens: [],
                },
            };
            const balance = AccountBalance._fromMirrorNodeResponse(data);
            expect(balance.hbars.toTinybars().toInt()).to.be.equal(500000000);
            expect(balance.tokens).to.not.be.null;
        });

        it("should parse response with tokens", function () {
            const data = {
                balance: {
                    balance: 100000000,
                    tokens: [
                        { token_id: "0.0.1001", balance: 50 },
                        { token_id: "0.0.1002", balance: 100 },
                    ],
                },
            };
            const balance = AccountBalance._fromMirrorNodeResponse(data);
            expect(balance.hbars.toTinybars().toInt()).to.be.equal(100000000);
            expect(balance.tokens.get("0.0.1001").toInt()).to.be.equal(50);
            expect(balance.tokens.get("0.0.1002").toInt()).to.be.equal(100);
        });

        it("should set tokenDecimals to 0", function () {
            const data = {
                balance: {
                    balance: 0,
                    tokens: [{ token_id: "0.0.1001", balance: 10 }],
                },
            };
            const balance = AccountBalance._fromMirrorNodeResponse(data);
            expect(balance.tokenDecimals.get("0.0.1001")).to.be.equal(0);
        });

        it("should handle missing balance gracefully", function () {
            const data = { balance: null };
            const balance = AccountBalance._fromMirrorNodeResponse(data);
            expect(balance.hbars.toTinybars().toInt()).to.be.equal(0);
        });
    });

    describe("executeWithSigner", function () {
        it("should delegate to signer.call", async function () {
            const query = new AccountBalanceQuery().setAccountId("0.0.3");
            const expectedBalance = AccountBalance._fromMirrorNodeResponse({
                balance: { balance: 100, tokens: [] },
            });
            const signer = {
                call: async () => expectedBalance,
            };
            const result = await query.executeWithSigner(signer);
            expect(result).to.equal(expectedBalance);
        });
    });

    describe("_setOperatorWith", function () {
        it("should return this (no-op)", function () {
            const query = new AccountBalanceQuery();
            const result = query._setOperatorWith(
                new AccountId(1),
                /** @type {any} */ (null),
                /** @type {any} */ (null),
            );
            expect(result).to.equal(query);
        });
    });
});
