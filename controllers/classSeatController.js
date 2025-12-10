const ClassSeat = require('../models/classSeat');
const School = require('../models/school');
const College = require('../models/college');
const Buy = require('../models/buyseats');
const User = require("../models/User");


// exports.createClassSeat = async (req, res) => {
//   try {
//     const { className, seat } = req.body;

//     if (!className || !seat) {
//       return res.status(400).json({ message: "className and seat are required" });
//     }
//     const newSeat = new ClassSeat({
//       className,
//       seat,
//       createdBy: req.user ? req.user._id : null   
//     });
//     await newSeat.save();
//     res.status(201).json({
//       message: "ClassSeat created successfully",
//       data: newSeat
//     });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };


exports.createClassSeat = async (req, res) => {
  try {
    const { className, seat } = req.body;

    if (!className || !seat) {
      return res.status(400).json({ message: "className and seat are required" });
    }

    // Check if class already exists
    const existingClass = await ClassSeat.findOne({ className });

    if (existingClass) {
      // Add seat instead of replacing
      existingClass.seat = existingClass.seat + Number(seat); 
      existingClass.updatedBy = req.user ? req.user._id : null;

      await existingClass.save();

      return res.status(200).json({
        message: "ClassSeat updated (seat added) successfully",
        data: existingClass
      });
    }

    // Create new if not exist
    const newSeat = new ClassSeat({
      className,
      seat,
      createdBy: req.user ? req.user._id : null
    });

    await newSeat.save();

    res.status(201).json({
      message: "ClassSeat created successfully",
      data: newSeat
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};



// exports.getAllClassSeats = async (req, res) => {
//   try {
//     let seats = await ClassSeat.find({ createdBy: req.user._id });

//     const response = [];
//     let grandTotal = 0; 

//     for (let seat of seats) {
//       let classData = null;

      
//       classData = await School.findById(seat.className);

      
//       if (!classData) {
//         classData = await College.findById(seat.className);
//       }

//       const price = classData?.price || 0;
//       const total = price * seat.seat;
//       grandTotal += total; 

//       response.push({
//         _id: seat._id,
//         classId: seat.className,
//         className: classData?.name || "Unknown",
//         price,
//         seat: seat.seat,
//         totalPrice: total,
//         createdBy: seat.createdBy,
//         createdAt: seat.createdAt
//       });
//     }

    
//     res.json({
//       seats: response,
//       grandTotal
//     });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };


exports.getAllClassSeats = async (req, res) => {
  try {
    const userId = req.user._id;

    // Find all seatIds already purchased by this user
    const boughtSeats = await Buy.find({ userId }).select("classSeatId");
    const boughtSeatIds = boughtSeats.map(b => b.classSeatId.toString());

    // Find all class seats created by the user but not yet bought
    let seats = await ClassSeat.find({
      createdBy: userId,
      _id: { $nin: boughtSeatIds } // exclude already bought
    });

    const response = [];
    let grandTotal = 0;

    for (let seat of seats) {
      let classData = null;

      // Check in School
      classData = await School.findById(seat.className);

      // If not found, check in College
      if (!classData) {
        classData = await College.findById(seat.className);
      }

      const price = classData?.price || 0;
      const total = price * seat.seat;
      grandTotal += total;

      response.push({
        _id: seat._id,
        classId: seat.className,
        className: classData?.name || "Unknown",
        price,
        seat: seat.seat,
        totalPrice: total,
        createdBy: seat.createdBy,
        createdAt: seat.createdAt
      });
    }

    res.json({
      seats: response,
      grandTotal
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


exports.deleteClassSeat = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: "ClassSeat ID is required" });
    }

    const deletedClass = await ClassSeat.findByIdAndDelete(id);

    if (!deletedClass) {
      return res.status(404).json({ message: "ClassSeat not found" });
    }

    return res.status(200).json({
      message: "ClassSeat deleted successfully",
      data: deletedClass
    });

  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};



// exports.buyClassSeats = async (req, res) => {
//   try {
//     const { classSeatIds } = req.body; 

//     if (!classSeatIds || !Array.isArray(classSeatIds) || classSeatIds.length === 0) {
//       return res.status(400).json({ message: "classSeatIds is required" });
//     }

//     const boughtRecords = [];

//     for (let classSeatId of classSeatIds) {
//       const seatDoc = await ClassSeat.findById(classSeatId);
//       if (!seatDoc) continue;

//       // Class data find karo (School ya College)
//       let classData = await School.findById(seatDoc.className);
//       if (!classData) classData = await College.findById(seatDoc.className);
//       if (!classData) continue;

//       const price = classData.price || 0;
//       const total = price * seatDoc.seat;

//       // Buy record create karo
//       const newBuy = new Buy({
//         classSeatId: seatDoc._id,
//         userId: req.user._id,
//         seat: seatDoc.seat,
//         price,
//         totalPrice: total,
//         paymentStatus: true
//       });

//       await newBuy.save();

//       // Response me sirf required fields push karo
//       boughtRecords.push({
//         classId: seatDoc._id,
//         className: classData.name,
//         seat: seatDoc.seat
//       });
//     }

//     res.status(201).json({
//       message: "Purchase successful",
//       boughtRecords
//     });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };


exports.buyClassSeats = async (req, res) => {
  try {
    const { classSeatIds, grandTotal } = req.body;

    if (!classSeatIds || !Array.isArray(classSeatIds) || classSeatIds.length === 0) {
      return res.status(400).json({ message: "classSeatIds is required" });
    }

    if (!grandTotal || grandTotal <= 0) {
      return res.status(400).json({ message: "grandTotal is required and must be greater than 0" });
    }

    const boughtRecords = [];
    let totalRequired = 0;
    const seatDocs = [];

    // Fetch and calculate
    for (let classSeatId of classSeatIds) {
      const seatDoc = await ClassSeat.findById(classSeatId);
      if (!seatDoc) continue;

      let classData = await School.findById(seatDoc.className);
      if (!classData) classData = await College.findById(seatDoc.className);
      if (!classData) continue;

      const totalPrice = (classData.price || 0) * seatDoc.seat;
      totalRequired += totalPrice;

      seatDocs.push({ seatDoc, classData, totalPrice });
    }

    if (grandTotal < totalRequired) {
      return res.status(400).json({ message: `Grand total is less than required total: ${totalRequired}` });
    }

    // Save or update buy record
    for (let { seatDoc, classData, totalPrice } of seatDocs) {
      
      // 🔎 Check existing buy for same user + same class
      let existingBuy = await Buy.findOne({
        userId: req.user._id,
        classSeatId: seatDoc.className    // same class
      });

      if (existingBuy) {
        // ✔️ Update seat count
        existingBuy.seat = existingBuy.seat + seatDoc.seat;
        existingBuy.totalPrice = (classData.price || 0) * existingBuy.seat;
        existingBuy.amountPaid = existingBuy.totalPrice;

        await existingBuy.save();

      } else {
        // Create new buy record
        const newBuy = new Buy({
          classSeatId: seatDoc.className,
          userId: req.user._id,
          seat: seatDoc.seat,
          price: classData.price || 0,
          totalPrice,
          amountPaid: totalPrice,
          paymentStatus: true
        });

        await newBuy.save();
      }

      // Delete class seat entry
      await ClassSeat.deleteOne({ _id: seatDoc._id });

      boughtRecords.push({
        classId: seatDoc.className,
        className: classData.name,
        seat: seatDoc.seat,
        totalPrice,
        amountPaid: totalPrice,
        paymentStatus: true
      });
    }

    res.status(201).json({
      message: "Purchase successful",
      grandTotal,
      boughtRecords
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};





// exports.getUserBuys = async (req, res) => {
//   try {
//     const userId = req.user._id;

//     const buys = await Buy.find({ userId })
//       .populate({
//         path: "classSeatId",
//         select: "className seat",
//       })
//       .sort({ createdAt: -1 });

//     if (!buys || buys.length === 0) {
//       return res.status(404).json({ message: "No purchases found" });
//     }

//     const buyRecords = [];
//     let totalSeats = 0;

//     for (let buy of buys) {
//       const classSeat = buy.classSeatId;
//       if (!classSeat) continue;

//       // Fetch class info from School or College
//       const classData =
//         (await School.findById(classSeat.className).select("name className")) ||
//         (await College.findById(classSeat.className).select("name className"));

//       if (classData) {
//         // Count allocated users for this class
//         const allocatedUsersCount = await User.countDocuments({
//           className: classSeat.className,
//         });

//         // Calculate remaining seats
//         const remainingSeats = Math.max((classSeat.seat || 0) - allocatedUsersCount, 0);

//         buyRecords.push({
//           id: classSeat._id,          // ✅ now seat table ID
//           classId: classData._id,     // ✅ now real class ID (School/College)
//           className: classData.className || classData.name,
//           seat: remainingSeats,
//         });

//         totalSeats += remainingSeats;
//       }
//     }

//     res.status(200).json({
//       totalRecords: totalSeats,
//       buyRecords,
//     });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

exports.getUserBuys = async (req, res) => {
  try {
    const userId = req.user._id;

    const buys = await Buy.find({ userId }).sort({ createdAt: -1 });

    if (!buys || buys.length === 0) {
      return res.status(404).json({ message: "No purchases found" });
    }

    const buyRecords = [];
    let totalSeatCount = 0;

    for (let buy of buys) {
      const classId = buy.classSeatId;  // This is School/College ID

      // 1️⃣ School/College fetch
      let classData = await School.findById(classId).select("name");
      if (!classData) {
        classData = await College.findById(classId).select("name");
      }
      if (!classData) continue;

      // 2️⃣ Find ClassSeat using className === School/College ID
      const classSeat = await ClassSeat.findOne({
        className: classId
      }).select("seat className");

      if (!classSeat) continue;

      // 3️⃣ Count allocated users (user.className == School/College ID)
      const allocatedUsersCount = await User.countDocuments({
        className: classId
      });

      // 4️⃣ Remaining seats
      const remainingSeats = Math.max(classSeat.seat - allocatedUsersCount, 0);

      buyRecords.push({
        id: classSeat._id,     // ClassSeat ka ID
        classId: classId,      // School/College ka ID
        className: classData.name,
        seat: remainingSeats,  // final remaining seat
      });

      totalSeatCount += remainingSeats;
    }

    res.status(200).json({
      totalRecords: totalSeatCount,
      buyRecords,
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};





exports.filterAvalibleSeat = async (req, res) => {
  try {
    const userId = req.user._id;
    const { classId } = req.query; 

    const buys = await Buy.find({ userId })
      .populate({
        path: "classSeatId",
        select: "className seat",
      })
      .sort({ createdAt: -1 });

    if (!buys || buys.length === 0) {
      return res.status(404).json({ message: "No purchases found" });
    }

    const buyRecords = [];
    let totalSeats = 0;

    for (let buy of buys) {
      const classSeat = buy.classSeatId;
      if (!classSeat) continue;

      // Fetch class info from School or College
      const classData =
        (await School.findById(classSeat.className).select("name className")) ||
        (await College.findById(classSeat.className).select("name className"));

      if (classData) {
        // ✅ Filter here using real class ID
        if (classId && classData._id.toString() !== classId.toString()) {
          continue; // skip if not matching
        }

        // Count allocated users for this class
        const allocatedUsersCount = await User.countDocuments({
          className: classSeat.className,
        });

        // Calculate remaining seats
        const remainingSeats = Math.max((classSeat.seat || 0) - allocatedUsersCount, 0);

        buyRecords.push({
          id: classSeat._id,          // classSeatId
          classId: classData._id,     // real class ID
          className: classData.className || classData.name,
          seat: remainingSeats,
        });

        totalSeats += remainingSeats;
      }
    }

    if (buyRecords.length === 0) {
      return res.status(404).json({ message: "No purchases found for this classId" });
    }

    res.status(200).json({
      totalRecords: totalSeats,
      buyRecords,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// exports.filterAvalibleSeat = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const { classId } = req.query; 

//     let buyQuery = { userId };
//     if (classId) {
//       buyQuery.classSeatId = classId; 
//     }

//     const buys = await Buy.find(buyQuery)
//       .populate({
//         path: "classSeatId",
//         select: "className seat",
//       })
//       .sort({ createdAt: -1 });

//     if (!buys || buys.length === 0) {
//       return res.status(404).json({ message: "No purchases found" });
//     }

//     const buyRecords = [];
//     let totalSeats = 0; 

//     for (let buy of buys) {
//       const classSeat = buy.classSeatId;
//       if (!classSeat) continue;

//       // Fetch class info from School or College
//       const classData =
//         (await School.findById(classSeat.className).select("name className")) ||
//         (await College.findById(classSeat.className).select("name className"));

//       if (classData) {
//         // Count allocated users for this class
//         const allocatedUsersCount = await User.countDocuments({
//           className: classSeat.className,
//         });

//         // Calculate remaining seats
//         const remainingSeats = Math.max((classSeat.seat || 0) - allocatedUsersCount, 0);

//         buyRecords.push({
//           classId: classSeat._id,
//           className: classData.className || classData.name,
//           seat: remainingSeats, // only value updates, key stays the same
//         });

//         totalSeats += remainingSeats;
//       }
//     }

//     res.status(200).json({
//       totalRecords: totalSeats, // total remaining seats
//       buyRecords,               // same structure, filtered if classId provided
//     });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };
