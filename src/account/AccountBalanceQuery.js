// SPDX-License-Identifier: Apache-2.0

import AccountId from "./AccountId.js";
import ContractId from "../contract/ContractId.js";
import AccountBalance from "./AccountBalance.js";
import Hbar from "../Hbar.js";

/**
 * @typedef {import("../client/Client.js").default<*, *>} Client
 */

/**
 * Get the balance of a Hedera™ crypto-currency account.
 *
 * This returns only the balance, so it is a smaller and faster reply
 * than AccountInfoQuery.
 *
 * This query is free and uses the mirror node REST API.
 */
export default class AccountBalanceQuery {
    /**
     * @param {object} [props]
     * @param {AccountId | string} [props.accountId]
     * @param {ContractId | string} [props.contractId]
     */
    constructor(props = {}) {
        /**
         * @type {?AccountId}
         * @private
         */
        this._accountId = null;

        /**
         * @type {?ContractId}
         * @private
         */
        this._contractId = null;

        /** @private */
        this._maxAttempts = 10;

        /** @private */
        this._minBackoff = 250;

        /** @private */
        this._maxBackoff = 8000;

        if (props.accountId != null) {
            this.setAccountId(props.accountId);
        }

        if (props.contractId != null) {
            this.setContractId(props.contractId);
        }
    }

    /**
     * @returns {?AccountId}
     */
    get accountId() {
        return this._accountId;
    }

    /**
     * Set the account ID for which the balance is being requested.
     *
     * This is mutually exclusive with `setContractId`.
     *
     * @param {AccountId | string} accountId
     * @returns {this}
     */
    setAccountId(accountId) {
        this._accountId =
            typeof accountId === "string"
                ? AccountId.fromString(accountId)
                : accountId.clone();

        return this;
    }

    /**
     * @returns {?ContractId}
     */
    get contractId() {
        return this._contractId;
    }

    /**
     * Set the contract ID for which the balance is being requested.
     *
     * This is mutually exclusive with `setAccountId`.
     *
     * @param {ContractId | string} contractId
     * @returns {this}
     */
    setContractId(contractId) {
        this._contractId =
            typeof contractId === "string"
                ? ContractId.fromString(contractId)
                : contractId.clone();

        return this;
    }

    /**
     * @param {number} maxAttempts
     * @returns {this}
     */
    setMaxAttempts(maxAttempts) {
        this._maxAttempts = maxAttempts;
        return this;
    }

    /**
     * @param {number} minBackoff
     * @returns {this}
     */
    setMinBackoff(minBackoff) {
        this._minBackoff = minBackoff;
        return this;
    }

    /**
     * @param {number} maxBackoff
     * @returns {this}
     */
    setMaxBackoff(maxBackoff) {
        this._maxBackoff = maxBackoff;
        return this;
    }

    /**
     * Returns zero cost since this query uses the free mirror node REST API.
     *
     * @returns {Promise<Hbar>}
     */
    getCost() {
        return Promise.resolve(new Hbar(0));
    }

    // Backward-compatible no-op stubs for callers that chain gRPC-specific methods

    /**
     * @param {AccountId[]} _nodeAccountIds
     * @returns {this}
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    setNodeAccountIds(_nodeAccountIds) {
        return this;
    }

    /**
     * @param {Hbar} _queryPayment
     * @returns {this}
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    setQueryPayment(_queryPayment) {
        return this;
    }

    /**
     * @param {Hbar} _maxQueryPayment
     * @returns {this}
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    setMaxQueryPayment(_maxQueryPayment) {
        return this;
    }

    /**
     * @param {number} _grpcDeadline
     * @returns {this}
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    setGrpcDeadline(_grpcDeadline) {
        return this;
    }

    /**
     * Execute this query using the signer (Wallet flow).
     *
     * @param {{ call: (request: this) => Promise<AccountBalance> }} signer
     * @returns {Promise<AccountBalance>}
     */
    executeWithSigner(signer) {
        return signer.call(this);
    }

    /**
     * No-op for Wallet.call() compatibility.
     *
     * @param {AccountId} _accountId
     * @param {import("../PublicKey.js").default} _publicKey
     * @param {(message: Uint8Array) => Promise<Uint8Array>} _transactionSigner
     * @returns {this}
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _setOperatorWith(_accountId, _publicKey, _transactionSigner) {
        return this;
    }

    /**
     * Execute this query against the mirror node REST API.
     *
     * @param {Client} client
     * @returns {Promise<AccountBalance>}
     */
    async execute(client) {
        if (this._accountId == null && this._contractId == null) {
            throw new Error(
                "either account ID or contract ID must be set before executing",
            );
        }

        if (client.isAutoValidateChecksumsEnabled()) {
            if (this._accountId != null) {
                this._accountId.validateChecksum(client);
            }
            if (this._contractId != null) {
                this._contractId.validateChecksum(client);
            }
        }

        const id =
            this._accountId != null
                ? this._accountId.toString()
                : /** @type {ContractId} */ (this._contractId).toString();

        const mirrorUrl = `${client.mirrorRestApiBaseUrl}/accounts/${id}`;

        let lastError = null;

        for (let attempt = 0; attempt < this._maxAttempts; attempt++) {
            if (attempt > 0) {
                const backoff = Math.min(
                    this._minBackoff * Math.pow(2, attempt - 1),
                    this._maxBackoff,
                );
                await new Promise((resolve) => setTimeout(resolve, backoff));
            }

            try {
                const response = await fetch(mirrorUrl);

                if (response.ok) {
                    const data = await response.json();
                    return AccountBalance._fromMirrorNodeResponse(data);
                }

                if (response.status === 404) {
                    throw new Error(
                        `account ${id} does not exist on the mirror node`,
                    );
                }

                // Retry on 429 (rate limit) and 5xx (server errors)
                if (response.status === 429 || response.status >= 500) {
                    lastError = new Error(
                        `mirror node returned HTTP ${response.status}`,
                    );
                    continue;
                }

                // Non-retryable error
                throw new Error(
                    `mirror node returned HTTP ${response.status}`,
                );
            } catch (error) {
                // 404 and non-retryable errors are rethrown immediately
                if (
                    error instanceof Error &&
                    (error.message.includes("does not exist") ||
                        (error.message.includes("mirror node returned HTTP") &&
                            !error.message.includes("429") &&
                            !error.message.includes("5")))
                ) {
                    throw error;
                }
                lastError = error;
            }
        }

        throw new Error(
            `failed to query account balance after ${this._maxAttempts} attempts: ${lastError != null ? /** @type {Error} */ (lastError).message : "unknown error"}`,
        );
    }
}
