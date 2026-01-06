
const mongoose = require('mongoose');
const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  middleName: { type: String },
  lastName: { type: String, required: true },
  mobileNumber: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  VerifyEmail: {
    type: String,
    default: 'no'
  },
  password: { type: String, required: true },
  countryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Location' },
  stateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Location' },
  cityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Location' },
  pincode: { type: String },
  studentType: { type: String, enum: ['school', 'college', 'institute'] }, 
  instituteName: { type: String },
  className: { type: mongoose.Schema.Types.ObjectId, ref: 'Adminschool' },
  
schoolershipstatus: {
  type: String,
  enum: ["Participant", "Eliminated", "Finalist", "NA"],
  default: "NA"
},
category: {
  _id: { type: mongoose.Schema.Types.ObjectId, ref: "Schoolercategory" },
  name: String
},

  session: { type: String },
   startDate: {
    type: String, 
  },
  endDate: {
    type: String, 
  },
   endTime: {
  type: String,
},
platformDetails:{
 type: String,
},


  // aadharCard: { type: String },
  marksheet: { type: String },
  resetPasswordOTP: { type: String },
  bonuspoint: { type: Number ,default: 0 },
 bonusDates: [String],
 deductedDates: [String],
 weeklyBonusDates: [String],
 monthlyBonusDates: [String],
 userLevelData: [
  {
    level: Number,
    levelBonusPoint: { type: Number, default: 0 },
    data: [
      {
        date: String,
        data: Array,
        dailyExperience: Number,
        weeklyBonus: Number,
        monthlyBonus: Number,
        deduction: Number
      }
    ]
  }
],

learning: [
  {
    learningId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Learnings",   
      required: true
    },
    session: {
      type: String,
      required: true
    },
    totalScore: {
      type: Number,
      default: 0
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  }
],
learningDailyHistory: [
      {
        learningId: { type: mongoose.Schema.Types.ObjectId, ref: "Learnings" },
        name: String,
        date: String,   
        score: Number,
        session: String,
        createdAt: { type: Date, default: Date.now }
      }
    ],
    
     practice: [
    {
      learningId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Learnings",
        required: true
      },
      session: {
        type: String,
        required: true
      },
      totalScore: {
        type: Number,
        default: 0
      },
      updatedAt: {
        type: Date,
        default: Date.now
      }
    }
  ],
  practiceDailyHistory: [
    {
      learningId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Learnings",
        required: true
      },
      name: {
        type: String
      },
      date: {
        type: String,
        required: true
      },
      score: {
        type: Number,
        required: true
      },
      session: {
        type: String,
        required: true
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }
  ],
  
strikeHistory: [
    {
      session: String,
      date: String,
      data: [
        {
          type: { type: String, enum: ["practice", "topic"] },
          score: Number,
          learningId: {
            _id: mongoose.Schema.Types.ObjectId,
            name: String
          },
          strickStatus: Boolean
        }
      ],
      dailyExperience: Number
    }
  ],

  strikeSessionSummary: [
    {
      session: String,
      totalDailyExperience: { type: Number, default: 0 },
      updatedAt: { type: Date, default: Date.now }
    }
  ],


 level: {
  type: Number,
  default: 1
},
 status: {
    type: String,
    enum: ['no', 'yes'],
    default: 'no'
  },

  userDetails: [
  {
    category: {
      _id: { type: mongoose.Schema.Types.ObjectId, ref: "Schoolercategory" },
      name: String,
      examType: Array
    },
    examTypes: [     
      {
        _id: String,
        name: String,
        status: {
  type: String,
  enum: ["Eligible", "Not Eligible", "NA"],
  default: "NA"
},
        result: {
          type: String,
          default: "NA"
        },
        AttemptStatus: {
          type: String,
          default: "NA"
        },
       exam: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "Schoolerexam",
  default: null
}
      }
    ]
  }
],

// userDetails: [
//   {
//     category: {
//       _id: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: "Schoolercategory"
//       },
//       name: String,
//       examType: Array
//     },

//     examTypes: [
//       {
//         _id: {
//           type: mongoose.Schema.Types.ObjectId,
//           ref: "Schoolerexam"
//         },
//         name: String,
//         status: {
//           type: String,
//           enum: ["Eligible", "NA"],
//           default: "NA"
//         },
//         result: {
//           type: String,
//           default: "NA"
//         }
//       }
//     ]
//   }
// ],


  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin1' },
  allocatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'OrganizationSign' },

  resetPasswordExpires: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: null }
 

});

module.exports = mongoose.model('User', userSchema);