import crypto from "crypto";
import ShortHash from "short-hash";
import { recoverPersonalSignature } from "@metamask/eth-sig-util";

import ethers from "ethers";
const getAddress = ethers.utils.getAddress;

import __BaseDAO__ from "./__BaseDAO__.js";
import GobblerOwner from "../models/GobblerOwner.js";

class GobblerOwnerDAO {
    static readSignature(req) {
        return new Promise((resolve, reject) => {
            const sig = req.body.sig;
            const message = req.body.message;
            const address = getAddress(
                recoverPersonalSignature({
                    data: message,
                    signature: sig,
                }),
            );

            resolve({ address, message });
        });
    }

    static get(query) {
        return new Promise((resolve, reject) => {
            __BaseDAO__
                .__get__(GobblerOwner, query)
                .then((document) => {
                    if (document !== null) {
                        resolve(document);
                    } else {
                        reject();
                    }
                })
                .catch(reject);
        });
    }

    static search(query, fields = {}) {
        return __BaseDAO__.__search__(GobblerOwner, query, fields);
    }

    static save(document) {
        return __BaseDAO__.__save__(document);
    }

    static createLinks(address) {
        return new Promise((resolve, reject) => {
            const createdAt = Date.now();
            const links = {
                naughty: {
                    side: "naughty",
                    inviteID: ShortHash(crypto.randomUUID()),
                    originator: address,
                    createdAt,
                },
                nice: {
                    side: "nice",
                    inviteID: ShortHash(crypto.randomUUID()),
                    originator: address,
                    createdAt,
                },
            };

            __BaseDAO__.__save__(new GobblerOwner(links.naughty)).then(() => {
                __BaseDAO__.__save__(new GobblerOwner(links.nice)).then(() => {
                    resolve([links.naughty, links.nice]);
                });
            });
        });
    }

    static seed(address) {
        return new Promise((resolve, reject) => {
            const createdAt = Date.now();
            const links = [];
            let i = 0;
            while (i < 50) {
                const nice = {
                    side: "nice",
                    inviteID: ShortHash(crypto.randomUUID()),
                    originator: address,
                    createdAt,
                };

                const naughty = {
                    side: "naughty",
                    inviteID: ShortHash(crypto.randomUUID()),
                    originator: address,
                    createdAt,
                };

                __BaseDAO__.__save__(new GobblerOwner(nice)).then((doc) => {
                    links.push(
                        `https://xmas.omakasea.com/list/${doc.inviteID}`,
                    );
                    __BaseDAO__
                        .__save__(new GobblerOwner(naughty))
                        .then((doc) => {
                            links.push(
                                `https://xmas.omakasea.com/list/${doc.inviteID}`,
                            );
                            if (links.length === 100) {
                                resolve(links);
                            }
                        });
                });
                i++;
            }
            // resolve()
        });
    }
}

export default GobblerOwnerDAO;
