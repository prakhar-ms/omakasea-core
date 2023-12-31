import __BaseDAO__ from "./__BaseDAO__.js";
import Artifact from "../models/Artifact.js";
import ArtifactSchema from "../schemas/ArtifactSchema.js";

class ArtifactDAO {
    static getMany(uids, fields = {}) {
        return __BaseDAO__.__search__(Artifact, uids, fields, { sequence: 1 });
    }

    static get(uploadId, uid) {
        return new Promise((resolve, reject) => {
            const query = {
                uploadId,
                uid,
            };
            __BaseDAO__.__get__(Artifact, query).then((document) => {
                if (document !== null) {
                    resolve(document);
                } else {
                    reject();
                }
            });
        });
    }

    static search(uploadId, fields = {}) {
        return __BaseDAO__.__search__(
            Artifact,
            { uploadId, isValid: true },
            fields,
            {
                sequence: 1,
            },
        );
    }

    static delete(artifact) {
        artifact.isValid = false;
        return __BaseDAO__.__save__(artifact);
    }

    static insertOne(artifact) {
        return __BaseDAO__.__save__(new Artifact(artifact));
    }

    static insertMany(uploadId, generated) {
        return new Promise((resolve, reject) => {
            for (let i = 0; i < generated.length; i++) {
                const artifact = new Artifact({
                    uploadId,
                    sequence: i + 1,
                    ...generated[i],
                });

                __BaseDAO__.__save__(artifact).then(() => {
                    if (i === generated.length - 1) {
                        resolve();
                    }
                });
            }
        });
    }

    static getActive(uploadId) {
        return new Promise((resolve, reject) => {
            ArtifactDAO.search(uploadId, {
                uploadId: 1,
                uid: 1,
                traits: 1,
                score: 1,
                sequence: 1,
            }).then((results) => {
                const artifacts = [];
                for (const res of results) {
                    artifacts.push({
                        uploadId: res.uploadId,
                        uid: res.uid,
                        score: res.score,
                        traits: res.traits,
                        sequence: res.sequence,
                    });
                }

                resolve(artifacts);
            });
        });
    }
}

export default ArtifactDAO;
