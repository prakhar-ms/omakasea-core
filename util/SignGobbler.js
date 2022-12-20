import dotenv from "dotenv";
dotenv.config();

import utils from "ethers/lib/utils.js";
import ethers from "ethers";
import { recoverPersonalSignature } from "@metamask/eth-sig-util";

import { ABI } from "../../../blockchain/EthGobblersABI.js";

const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const HTTP_RPC_URL = process.env.HTTP_RPC_URL;
const BLOCKCHAIN_NETWORK = process.env.BLOCKCHAIN_NETWORK;

const HTTP_PROVIDER = new ethers.providers.JsonRpcProvider(
    HTTP_RPC_URL,
    BLOCKCHAIN_NETWORK,
);

const ETHERS_CONTRACT = new ethers.Contract(CONTRACT_ADDRESS, ABI, PROVIDER);

class SignGobbler {
    static listen() {
        const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, PROVIDER);

        contract.on("Broadcast", (event) => {
            console.log(event);
        });
    }

    static sign(fnName, signature) {
        return new Promise((resolve, reject) => {
            const senderAddress = getAddress(
                recoverPersonalSignature(signature),
            );

            ETHERS_CONTRACT.signatureNonce(senderAddress).then((res) => {
                const sigNonce = res._hex;
                const fnNameSig = Number(
                    utils.keccak256(utils.toUtf8Bytes(fnName)).substring(0, 10),
                );

                utils
                    .solidityKeccak256(
                        ["address", "address", "bytes4", "uint256"],
                        [senderAddress, CONTRACT_ADDRESS, fnNameSig, sigNonce],
                    )
                    .then((messageHash) => {
                        const SIGNER = new ethers.Wallet(
                            process.env.PRIVATE_KEY,
                            HTTP_PROVIDER,
                        );
                        SIGNER.signMessage(messageHash).then((signature) => {
                            resolve({ messageHash, signature });
                        });
                    });
            });
        });
    }
}

export default SignGobbler;
