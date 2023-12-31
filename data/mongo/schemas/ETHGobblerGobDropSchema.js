export default {
    isActive: { type: Boolean },
    name: { type: String },
    minETH: { type: String, default: "0" },
    maxGen: { type: Number, default: 100 },
    subID: { type: Number, default: 0 },
    maxSupply: { type: Number, default: null },
    type: { type: String },
    equipSlot: { type: String },
    effect: { type: Object },
    criteria: { type: Object },
    varietyAssignment: { type: Object },
    varieties: { type: Object },
    template: { type: String },
    createdAt: { type: Number },
};
