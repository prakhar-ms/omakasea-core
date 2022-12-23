import dotenv from "dotenv";
dotenv.config();

import utils from "ethers/lib/utils.js";
import ethers from "ethers";
import { recoverPersonalSignature } from "@metamask/eth-sig-util";

import { ABI } from "../../../blockchain/EthGobblersABI.js";

import GobblerOwnerDAO from "../data/mongo/dao/GobblerOwnerDAO.js";
import ETHGobblerDAO from "../data/mongo/dao/ETHGobblerDAO.js";

const BLOCKCHAIN_NETWORK = process.env.BLOCKCHAIN_NETWORK;
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const BURN_ADDRESS = process.env.BURN_ADDRESS;
const HTTP_RPC_URL = process.env.HTTP_RPC_URL;
const WS_RPC_URL = process.env.WS_RPC_URL;

class ETHGobblerNFT {
    static getBurySignature(fnName, signature, message, tokenID) {
        console.log(`${fnName}, ${signature}, ${message}, ${tokenID}`);
        return new Promise((resolve, reject) => {
            const provider = new ethers.providers.JsonRpcProvider(
                HTTP_RPC_URL,
                BLOCKCHAIN_NETWORK,
            );

            const contract = new ethers.Contract(
                CONTRACT_ADDRESS,
                ABI,
                provider,
            );

            const senderAddress = ethers.utils.getAddress(
                recoverPersonalSignature({ data: message, signature }),
            );

            contract.signatureNonce(senderAddress).then((res) => {
                const sigNonce = res._hex;
                const byteArray = utils.toUtf8Bytes(fnName);
                const fnNameSig = utils.hexlify(byteArray.slice(0, 4));

                const messageHash = utils.solidityKeccak256(
                    ["address", "address", "bytes4", "uint256", "uint256"],
                    [
                        senderAddress,
                        CONTRACT_ADDRESS,
                        fnNameSig,
                        tokenID,
                        sigNonce,
                    ],
                );
                const SIGNER = new ethers.Wallet(
                    process.env.PRIVATE_KEY,
                    provider,
                );

                SIGNER.signMessage(utils.arrayify(messageHash))
                    .then((signature) => {
                        const data = {
                            messageHash,
                            signature,
                        };

                        resolve(data);
                    })
                    .catch(reject);
            });
        });
    }

    static getActionSignature(fnName, signature, message) {
        return new Promise((resolve, reject) => {
            const provider = new ethers.providers.JsonRpcProvider(
                HTTP_RPC_URL,
                BLOCKCHAIN_NETWORK,
            );

            const contract = new ethers.Contract(
                CONTRACT_ADDRESS,
                ABI,
                provider,
            );

            const senderAddress = ethers.utils.getAddress(
                recoverPersonalSignature({ data: message, signature }),
            );

            contract.signatureNonce(senderAddress).then((res) => {
                const sigNonce = res._hex;
                const byteArray = utils.toUtf8Bytes(fnName);
                const fnNameSig = utils.hexlify(byteArray.slice(0, 4));

                const messageHash = utils.solidityKeccak256(
                    ["address", "address", "bytes4", "uint256"],
                    [senderAddress, CONTRACT_ADDRESS, fnNameSig, sigNonce],
                );
                const SIGNER = new ethers.Wallet(
                    process.env.PRIVATE_KEY,
                    provider,
                );

                SIGNER.signMessage(utils.arrayify(messageHash))
                    .then((signature) => {
                        const data = {
                            messageHash,
                            signature,
                        };

                        resolve(data);
                    })
                    .catch(reject);
            });
        });
    }

    static getMintSignature(signature, message) {
        return new Promise((resolve, reject) => {
            const provider = new ethers.providers.JsonRpcProvider(
                HTTP_RPC_URL,
                BLOCKCHAIN_NETWORK,
            );

            const contract = new ethers.Contract(
                CONTRACT_ADDRESS,
                ABI,
                provider,
            );

            const senderAddress = ethers.utils.getAddress(
                recoverPersonalSignature({ data: message, signature }),
            );

            GobblerOwnerDAO.get({ owner: senderAddress })
                .then((gobblerOwner) => {
                    if (gobblerOwner) {
                        if (!gobblerOwner.mintData) {
                            ETHGobblerNFT.createMintSignature(
                                senderAddress,
                                provider,
                                gobblerOwner,
                                contract,
                            )
                                .then(resolve)
                                .catch(reject);
                        } else {
                            resolve(gobblerOwner.mintData);
                        }
                    } else {
                        reject();
                    }
                })
                .catch(reject);
        });
    }

    static createMintSignature(
        senderAddress,
        provider,
        gobblerOwner,
        contract,
    ) {
        return new Promise((resolve, reject) => {
            contract.signatureNonce(senderAddress).then((res) => {
                const sigNonce = res._hex;
                const byteArray = utils.toUtf8Bytes("mint");
                const fnNameSig = utils.hexlify(byteArray.slice(0, 4));

                const messageHash = utils.solidityKeccak256(
                    ["address", "address", "bytes4", "uint256"],
                    [senderAddress, CONTRACT_ADDRESS, fnNameSig, sigNonce],
                );
                const SIGNER = new ethers.Wallet(
                    process.env.PRIVATE_KEY,
                    provider,
                );

                SIGNER.signMessage(utils.arrayify(messageHash))
                    .then((signature) => {
                        const mintData = {
                            messageHash,
                            signature,
                        };

                        gobblerOwner.mintData = mintData;
                        GobblerOwnerDAO.save(gobblerOwner).then(() => {
                            resolve(mintData);
                        });
                    })
                    .catch(reject);
            });
        });
    }

    static listen() {
        const provider = new ethers.providers.WebSocketProvider(
            WS_RPC_URL,
            BLOCKCHAIN_NETWORK,
        );

        provider._websocket.on("close", (code) => {
            ETHGobblerNFT.listen();
        });

        const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);
        contract.on("Transfer", (from, to, data) => {
            if (to !== BURN_ADDRESS) {
                GobblerOwnerDAO.get({ owner: to })
                    .then((gobblerOwner) => {
                        const tokenID = Number(
                            ethers.utils.formatUnits(data, 0),
                        );
                        const tokenData = {
                            tokenID,
                            data,
                        };

                        gobblerOwner.hasMinted = true;
                        gobblerOwner.tokenData = tokenData;
                        GobblerOwnerDAO.save(gobblerOwner).then(() => {
                            const spec = {
                                tokenID: tokenData.tokenID,
                                generation: 1,
                                disposition: gobblerOwner.side,
                            };
                            ETHGobblerDAO.create(spec);
                        });
                    })
                    .catch((error) => {
                        console.log(error);
                    });
            } else {
                GobblerOwnerDAO.get({ owner: from })
                    .then((gobblerOwner) => {
                        gobblerOwner.hasBuried = true;
                        GobblerOwnerDAO.save(gobblerOwner);
                    })
                    .catch((error) => {
                        console.log(error);
                    });
            }
        });

        contract.on("Feed", (tokenID, amount, owner) => {
            console.log("Feed -------------------");
            console.log({ tokenID, amount, owner });
        });

        contract.on("Groom", (tokenID, amount, owner) => {
            console.log("Groom -------------------");
            console.log({ tokenID, amount, owner });
        });

        contract.on("Sleep", (tokenID, owner) => {
            console.log("Sleep -------------------");
            console.log({ tokenID, owner });
        });

        contract.on("Bury", (tokenID, owner) => {
            console.log("Bury -------------------");
            console.log({ tokenID, owner });
        });

        contract.on("Mitosis", (parentTokenID, newTokenID, owner) => {
            console.log("Mitosis -------------------");
            console.log({ parentTokenID, newTokenID, owner });
        });

        contract.on("ConfigureTraits", (tokenID, traitIDs) => {
            console.log("ConfigureTraits -------------------");
            console.log({ tokenID, traitIDs });
        });

        contract.on(
            "TraitUnlocked",
            (parentGobblerID, newTraitTokenID, owner) => {
                console.log("TraitUnlocked -------------------");
                console.log({ parentGobblerID, newTraitTokenID, owner });
            },
        );

        contract.on(
            "GobblerGobbled",
            (parentGobblerID, victimID, newGobblerGobblerID) => {
                console.log("GobblerGobbled -------------------");
                console.log({ parentGobblerID, victimID, newGobblerGobblerID });
            },
        );
    }

    static updateHealth() {
        // decrease health randomly between 3 - 7
    }
}

export default ETHGobblerNFT;
