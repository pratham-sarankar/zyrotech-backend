import mongoose, { Document } from "mongoose";

/**
 * Interface for KYC Basic Details
 */
interface IBasicDetails {
  fullName: string;
  dob: Date;
  gender: "male" | "female" | "other";
  pan: string;
  aadharNumber: string;
  isVerified: boolean;
  verificationDate?: Date;
  verificationStatus: "pending" | "verified" | "rejected";
  rejectionReason?: string;
}

/**
 * Interface for Risk Profiling
 */
interface IRiskProfiling {
  questionsAndAnswers: Array<{
    question: string;
    answer: string;
  }>;
  completedAt: Date;
  isVerified: boolean;
  verificationStatus: "pending" | "verified" | "rejected";
  verificationDate?: Date;
  rejectionReason?: string;
}

/**
 * Interface for Capital Management
 */
interface ICapitalManagement {
  questionsAndAnswers: Array<{
    question: string;
    answer: string;
  }>;
  completedAt: Date;
  isVerified: boolean;
  verificationStatus: "pending" | "verified" | "rejected";
  verificationDate?: Date;
  rejectionReason?: string;
}

/**
 * Interface for Experience
 */
interface IExperience {
  questionsAndAnswers: Array<{
    question: string;
    answer: string;
  }>;
  completedAt: Date;
  isVerified: boolean;
  verificationStatus: "pending" | "verified" | "rejected";
  verificationDate?: Date;
  rejectionReason?: string;
}

/**
 * Interface for KYC Document
 */
export interface IKYC extends Document {
  userId: mongoose.Types.ObjectId;
  basicDetails: IBasicDetails;
  riskProfiling?: IRiskProfiling;
  capitalManagement?: ICapitalManagement;
  experience?: IExperience;
  // Future sections can be added here
  // addressDetails?: IAddressDetails;
  // employmentDetails?: IEmploymentDetails;
  // bankDetails?: IBankDetails;
  status: "pending" | "in_progress" | "completed" | "rejected";
  createdAt: Date;
  updatedAt: Date;
}

/**
 * KYC Schema
 */
const kycSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    basicDetails: {
      fullName: {
        type: String,
        required: [true, "Full name is required"],
        trim: true,
        minlength: [2, "Name must be at least 2 characters long"],
        maxlength: [100, "Name cannot exceed 100 characters"],
      },
      dob: {
        type: Date,
        required: [true, "Date of birth is required"],
        validate: {
          validator: function (value: Date) {
            // Ensure DOB is not in the future and person is at least 18 years old
            const today = new Date();
            let age = today.getFullYear() - value.getFullYear();
            const monthDiff = today.getMonth() - value.getMonth();
            if (
              monthDiff < 0 ||
              (monthDiff === 0 && today.getDate() < value.getDate())
            ) {
              age--;
            }
            return age >= 18;
          },
          message: "Person must be at least 18 years old",
        },
      },
      gender: {
        type: String,
        required: [true, "Gender is required"],
        enum: {
          values: ["male", "female", "other"],
          message: "Gender must be either male, female, or other",
        },
      },
      pan: {
        type: String,
        required: [true, "PAN number is required"],
        unique: true,
        sparse: true,
        validate: {
          validator: function (value: string) {
            // PAN format: ABCDE1234F
            return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(value);
          },
          message: "Invalid PAN format. Must be in format: ABCDE1234F",
        },
      },
      aadharNumber: {
        type: String,
        required: [true, "Aadhar number is required"],
        unique: true,
        sparse: true,
        validate: {
          validator: function (value: string) {
            // Aadhar format: 12 digits
            return /^\d{12}$/.test(value);
          },
          message: "Invalid Aadhar number. Must be 12 digits",
        },
      },
      isVerified: {
        type: Boolean,
        default: false,
      },
      verificationDate: {
        type: Date,
      },
      verificationStatus: {
        type: String,
        enum: ["pending", "verified", "rejected"],
        default: "pending",
      },
      rejectionReason: {
        type: String,
      },
    },
    riskProfiling: {
      type: {
        questionsAndAnswers: [
          {
            question: {
              type: String,
              required: [true, "Question is required"],
              trim: true,
            },
            answer: {
              type: String,
              required: [true, "Answer is required"],
              trim: true,
            },
          },
        ],
        completedAt: Date,
        isVerified: {
          type: Boolean,
          default: false,
        },
        verificationStatus: {
          type: String,
          enum: ["pending", "verified", "rejected"],
          default: "pending",
        },
        verificationDate: Date,
        rejectionReason: String,
      },
      _id: false,
      default: undefined,
    },
    capitalManagement: {
      type: {
        questionsAndAnswers: [
          {
            question: {
              type: String,
              required: [true, "Question is required"],
              trim: true,
            },
            answer: {
              type: String,
              required: [true, "Answer is required"],
              trim: true,
            },
          },
        ],
        completedAt: Date,
        isVerified: {
          type: Boolean,
          default: false,
        },
        verificationStatus: {
          type: String,
          enum: ["pending", "verified", "rejected"],
          default: "pending",
        },
        verificationDate: Date,
        rejectionReason: String,
      },
      _id: false,
      default: undefined,
    },
    experience: {
      type: {
        questionsAndAnswers: [
          {
            question: {
              type: String,
              required: [true, "Question is required"],
              trim: true,
            },
            answer: {
              type: String,
              required: [true, "Answer is required"],
              trim: true,
            },
          },
        ],
        completedAt: Date,
        isVerified: {
          type: Boolean,
          default: false,
        },
        verificationStatus: {
          type: String,
          enum: ["pending", "verified", "rejected"],
          default: "pending",
        },
        verificationDate: Date,
        rejectionReason: String,
      },
      _id: false,
      default: undefined,
    },
    status: {
      type: String,
      enum: ["pending", "in_progress", "completed", "rejected"],
      default: "pending",
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt fields
  }
);

// Indexes for faster queries
kycSchema.index({ userId: 1 });
kycSchema.index({ "basicDetails.pan": 1 });
kycSchema.index({ "basicDetails.aadharNumber": 1 });

export default mongoose.model<IKYC>("KYC", kycSchema);
