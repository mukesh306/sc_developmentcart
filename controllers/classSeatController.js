const ClassSeat = require('../models/classSeat');
const School = require('../models/school');
const College = require('../models/college');
const Buy = require('../models/buyseats');

1
exports.createClassSeat = async (req, res) => {
  try {
    const { className, seat } = req.body;

    if (!className || !seat) {
      return res.status(400).json({ message: "className and seat are required" });
    }
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

    // Pehle sab seats fetch karo aur total calculate karo
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

    // Check if grandTotal is enough
    if (grandTotal < totalRequired) {
      return res.status(400).json({ message: `Grand total is less than required total: ${totalRequired}` });
    }

    // Save each buy record
    for (let { seatDoc, classData, totalPrice } of seatDocs) {
      const newBuy = new Buy({
        classSeatId: seatDoc._id,
        userId: req.user._id,
        seat: seatDoc.seat,
        price: classData.price || 0,
        totalPrice,
        amountPaid: totalPrice, // har seat ka required total save karo
        paymentStatus: true
      });

      await newBuy.save();

      boughtRecords.push({
        classId: seatDoc._id,
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


exports.getUserBuys = async (req, res) => {
  try {
    const userId = req.user._id;

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
    let totalSeats = 0; // 👈 to store total seat count

    for (let buy of buys) {
      const classSeat = buy.classSeatId;
      if (!classSeat) continue;

      // Try fetching from both School and College collections
      let classData =
        (await School.findById(classSeat.className).select("name className")) ||
        (await College.findById(classSeat.className).select("name className"));

      if (classData) {
        buyRecords.push({
          classId: classSeat._id,
          className: classData.className || classData.name,
          seat: classSeat.seat,
        });

        totalSeats += classSeat.seat || 0; // 👈 add seat count
      }
    }

    
    res.status(200).json({
      totalRecords: totalSeats, // 👈 total seat count instead of record count
      buyRecords,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};



