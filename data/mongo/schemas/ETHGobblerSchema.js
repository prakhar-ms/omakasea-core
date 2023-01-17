export default {
    tokenID: { type: Number },
    parentTokenID: { type: Number, default: null },
    disposition: { type: String },
    health: { type: Number, default: 100 },
    mitosisCount: { type: Number, default: 0 },
    traitCount: { type: Number, default: 0 },
    lastMitosis: { type: Number, default: 0 },
    lastTrait: { type: Number, default: 0 },
    sleptAt: { type: Number, default: 0 },
    generation: { type: Number, default: null },
    isAwake: { type: Boolean, default: true },
    isBuried: { type: Boolean, default: false },
    naem: { type: String, default: null },
    createdAt: { type: Number },
};
