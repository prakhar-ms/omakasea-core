import dotenv from "dotenv";
dotenv.config();

import axios from "axios";
import { recoverPersonalSignature } from "@metamask/eth-sig-util";
import ContributorDAO from "../data/mongo/dao/ContributorDAO.js";
import { Alchemy, Network } from "alchemy-sdk";

import ethers from "ethers";
const getAddress = ethers.utils.getAddress;

const ALCHEMY_ID = process.env.NEXT_PUBLIC_ALCHEMY_ID;
const ALCHEMY_URL = `https://eth-mainnet.g.alchemy.com/nft/v2/${ALCHEMY_ID}`;

const MGLTH_CONTRACT_ADDRESS = "0xabaCAdabA4A41e86092847d7b07D00094B8203F8";
const MGLTH_COMPARE = MGLTH_CONTRACT_ADDRESS.toLocaleLowerCase();

const METADATA_URL = `${ALCHEMY_URL}/getNFTMetadata?refreshCache=false&contractAddress=${MGLTH_CONTRACT_ADDRESS}&tokenId`;
const TOKENS_OWNED_URL = `${ALCHEMY_URL}/getContractsForOwner?owner`;

const INVALID_TOKEN = {
    tokenId: null,
    isVandal: null,
    position: null,
    seconds: null,
};

class MegalithToken {
    static isContributor(address) {
        return new Promise((resolve, reject) => {
            ContributorDAO.get({ address, isActive: true })
                .then((contributor) => {
                    if (contributor) {
                        resolve({
                            isActive: true,
                            symbol: contributor.symbol,
                            tokenId: contributor.tokenId,
                        });
                    } else {
                        resolve({ isActive: false });
                    }
                })
                .catch(reject);
        });
    }

    static check(req) {
        return new Promise((resolve, reject) => {
            const message = req.headers.message;
            if (message !== null && message !== undefined) {
                if (message.length > 0) {
                    const data = JSON.parse(message);
                    const sig = req.headers.sig;

                    const signature = {
                        data: message,
                        signature: sig,
                    };

                    const address = getAddress(
                        recoverPersonalSignature(signature),
                    );

                    let tokenId = Number(data.tokenId);
                    let symbol = req.session.symbol;

                    if (data.tokenId === null) {
                        tokenId = req.session.tokenId;
                    } else if (req.session.tokenId !== tokenId) {
                        tokenId = null;
                        symbol = null;
                    }

                    const isAuthorized =
                        address === data.address && symbol !== null;
                    let result = { isAuthorized, address, tokenId, symbol };

                    if (isAuthorized) {
                        resolve(result);
                    } else {
                        MegalithToken.isContributor(address).then(
                            (contributor) => {
                                if (contributor.isActive) {
                                    result.isAuthorized = true;
                                    result.symbol = contributor.symbol;
                                    result.tokenId = contributor.tokenId;
                                }
                                resolve(result);
                            },
                        );
                    }
                } else {
                    reject();
                }
            }
        });
    }

    static authenticate(req) {
        return new Promise((resolve, reject) => {
            const message = req.body.message;
            const data = JSON.parse(message);
            const sig = req.body.sig;

            const signature = {
                data: message,
                signature: sig,
            };

            const tokenId = Number(data.tokenId);
            const address = getAddress(recoverPersonalSignature(signature));

            MegalithToken.hasToken(address, tokenId)
                .then(resolve)
                .catch(reject);
        });
    }

    static hasToken(address, tokenId) {
        return new Promise((resolve, reject) => {
            const alchemy = new Alchemy({
                apiKey: process.env.NEXT_PUBLIC_ALCHEMY_ID,
                network: Network.ETH_MAINNET,
            });
            alchemy.nft
                .getOwnersForNft(MGLTH_CONTRACT_ADDRESS, tokenId)
                .then((result) => {
                    let isValid = false;
                    if (result.owners.length > 0) {
                        isValid = result.owners[0] === address.toLowerCase();
                        resolve({ address, isValid, tokenId, symbol: "KEYS" });
                    } else {
                        resolve({ address, isValid, tokenId, symbol: "KEYS" });
                    }
                });
        });
    }

    static isValid(parsed) {
        let valid = true;
        for (const key of Object.keys(parsed)) {
            valid = !(parsed[key] === null && parsed[key] === undefined);
        }
        return valid;
    }

    static parse(token) {
        if (token.attributes.length > 0) {
            const tokenId = this.getTokenId(token);
            const isVandal = this.isVandal(token);
            const position = this.getPosition(token);
            const seconds = this.getSeconds(token);

            return { tokenId, isVandal, position, seconds };
        }

        return INVALID_TOKEN;
    }

    static isVandal(token) {
        return this.__getAttr__("Vandal", token) === "true";
    }

    static getPosition(token) {
        const position = this.__getAttr__("Stream Queue Position", token);
        if (position !== null && position !== undefined) {
            return Number(position.replace("/409", ""));
        }

        return null;
    }

    static getSeconds(token) {
        let seconds = this.__getAttr__("Stream Seconds", token);
        if (seconds !== null && seconds !== undefined) {
            seconds = Number(seconds);
            seconds = seconds < 10 ? 10 : seconds;
            return seconds;
        }

        return null;
    }

    static getTokenId(token) {
        try {
            return Number(token.name.split("#")[1]);
        } catch (error) {}
        return null;
    }

    static getToken(tokenId) {
        return new Promise((resolve, reject) => {
            if (0 <= tokenId) {
                const url = `${METADATA_URL}=${tokenId}`;

                axios
                    .get(url)
                    .then((res) => {
                        resolve(this.parse(res.data.metadata));
                    })
                    .catch((error) => {
                        reject(error);
                    });
            } else {
                resolve({
                    tokenId,
                    isVandal: true,
                    position: 1000,
                    seconds: tokenId,
                });
            }
        });
    }

    static tokensOwned(address) {
        return new Promise((resolve, reject) => {
            const url = `${TOKENS_OWNED_URL}=${address}`;

            axios
                .get(url)
                .then((res) => {
                    const { contracts } = res.data;

                    let i = 0;
                    const found = [];
                    for (const contract of contracts) {
                        if (contract.address === MGLTH_COMPARE) {
                            found.push(contract);
                        }
                    }

                    this.__tokenDetails__(resolve, found);
                })
                .catch(reject);
        });
    }

    static __tokenDetails__(resolve, found, details = []) {
        if (found.length > 0) {
            const contract = found.shift();
            MegalithToken.getToken(Number(contract.tokenId)).then((data) => {
                data.symbol = contract.symbol;
                details.push(data);
                this.__tokenDetails__(resolve, found, details);
            });
        } else {
            resolve(details);
        }
    }

    static __getAttr__(key, token) {
        try {
            for (const attr of token.attributes) {
                if (key === attr.trait_type) {
                    return attr.value;
                }
            }
        } catch (error) {}

        return null;
    }
}

export default MegalithToken;
