import mongoose from "mongoose";

const ObjectId = mongoose.Schema.Types.ObjectId;

const claimMessageSchema = new mongoose.Schema(
  {
    claimId: {
      type: ObjectId,
      ref: "Claim",
      required: true,
      index: true,
    },
    senderUserId: {
      type: ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    body: {
      type: String,
      required: [true, "Message body is required"],
      trim: true,
      maxlength: 2000,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

claimMessageSchema.index({ claimId: 1, createdAt: 1 });

claimMessageSchema.method("toPublicJSON", function toPublicJSON() {
  const obj = this.toObject({ versionKey: false });
  obj.id = String(obj._id);
  delete obj._id;
  obj.claimId = String(obj.claimId);
  obj.senderUserId = String(obj.senderUserId);
  return obj;
});

const ClaimMessage = mongoose.model(
  "ClaimMessage",
  claimMessageSchema,
  "claim_messages"
);
export default ClaimMessage;
