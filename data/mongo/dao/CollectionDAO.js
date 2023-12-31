import __BaseDAO__ from "./__BaseDAO__.js";
import Collection from "../../models/Collection.js";
import CollectionSchema from "../schemas/CollectionSchema.js";

class CollectionDAO {
    static get(auth) {
        return new Promise((resolve, reject) => {
            const query = {
                creatorAddress: auth.addr,
                isEditing: true,
                isUploaded: false,
            };
            __BaseDAO__.__get__(Collection, query).then((document) => {
                if (document !== null) {
                    resolve(document);
                } else {
                    reject();
                }
            });
        });
    }

    static current(auth) {
        return new Promise((resolve, reject) => {
            const query = {
                creatorAddress: auth.addr,
                isEditing: true,
                isUploaded: false,
            };
            __BaseDAO__.__get__(Collection, query).then((document) => {
                if (document !== null) {
                    const fields = __BaseDAO__.__extract__(
                        CollectionSchema,
                        document,
                    );
                    resolve(fields);
                } else {
                    reject({ error: "unauthorized" });
                }
            });
        });
    }

    static fetch(auth) {
        return new Promise((resolve, reject) => {
            const query = {
                creatorAddress: auth.addr,
                isEditing: true,
                isUploaded: false,
            };
            __BaseDAO__.__fetch__(Collection, query).then((document) => {
                resolve(document);
            });
        });
    }

    static saveUpload(auth, uploadId, data) {
        return new Promise((resolve, reject) => {
            CollectionDAO.fetch(auth).then((document) => {
                const resources = { ...document.resources };
                resources[uploadId] = data;
                document.resources = resources;
                __BaseDAO__.__save__(document).then(() => {
                    resolve();
                });
            });
        });
    }

    static save(collection) {
        return __BaseDAO__.__save__(collection);
    }

    static saveIndexes(auth, uploadId, resource) {
        return new Promise((resolve, reject) => {
            CollectionDAO.fetch(auth).then((document) => {
                document.resources[uploadId] = resource;
                document.markModified("resources");

                document.generated[uploadId] = true;
                document.markModified("generated");

                __BaseDAO__.__save__(document).then(() => {
                    resolve();
                });
            });
        });
    }

    static webUpdate(auth, fields) {
        return new Promise((resolve, reject) => {
            CollectionDAO.fetch(auth).then((document) => {
                __BaseDAO__.__map__(fields, document).then((doc) => {
                    __BaseDAO__.__save__(doc).then((d) => {
                        const fields = __BaseDAO__.__extract__(
                            CollectionSchema,
                            d,
                        );
                        resolve(fields);
                    });
                });
            });
        });
    }

    static endMint(doc) {
        doc.isEditing = false;
        doc.isUploaded = true;
        return __BaseDAO__.__save__(doc);
    }
}

export default CollectionDAO;
