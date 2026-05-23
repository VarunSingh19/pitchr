import mongoose, { Schema, model, models, type Document } from "mongoose";

export interface IPaymentMethod extends Document {
  type: "upi" | "qr_code";
  label: string;
  value: string; // UPI ID string or relative file path to the QR code image
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentMethodSchema = new Schema<IPaymentMethod>(
  {
    type: { type: String, enum: ["upi", "qr_code"], required: true },
    label: { type: String, required: true },
    value: { type: String, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default models.PaymentMethod || model<IPaymentMethod>("PaymentMethod", PaymentMethodSchema);
