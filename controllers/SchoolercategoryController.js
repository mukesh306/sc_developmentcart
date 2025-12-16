const mongoose = require('mongoose');
const Schoolercategory = require("../models/schoolershipcategory");
const Schoolergroup = require("../models/Schoolergroup");
const Schoolerexam = require("../models/Schoolerexam");
const ExamResult = require("../models/examResult");
const CategoryTopUser = require("../models/CategoryTopUser");


exports.createSchoolercategory = async (req, res) => {
  try {
    const { name, price, groupSize, finalist, examSize } = req.body;
    const createdBy = req.user?._id;

    if (!name || !price || !groupSize || !finalist || !examSize) {
      return res.status(400).json({
        message: "All fields (name, price, groupSize, finalist, examSize) are required."
      });
    }

    if (isNaN(examSize) || examSize <= 0) {
      return res.status(400).json({
        message: "examSize must be a valid number."
      });
    }

    
    let examType = [];
    for (let i = 1; i <= examSize; i++) {
      examType.push({
        name: `Exam ${i}`,
        id: new mongoose.Types.ObjectId().toString(),
        count: i,
        groupSize: i === 1 ? groupSize : 0
      });
    }

    const newCategory = new Schoolercategory({
      name,
      price,
      groupSize,
      finalist,
      examSize,
      examType,
      createdBy,
    });

    await newCategory.save();

    res.status(201).json({
      message: "Category created successfully.",
      category: newCategory,
    });

  } catch (error) {
    res.status(500).json({
      message: "Error creating category.",
      error: error.message
    });
  }
};


exports.getAllSchoolercategories = async (req, res) => {
  try {
    const categories = await Schoolercategory.find()
      .populate("createdBy", "firstName lastName email")
      .sort({ createdAt: 1 });

    res.status(200).json(categories);
  } catch (error) {
    res.status(500).json({ message: "Error fetching categories.", error });
  }
};


// exports.getSchoolercategoryById = async (req, res) => {
//   try {
//     const category = await Schoolercategory.findById(req.params.id)
//       .populate("createdBy", "firstName lastName email");

//     if (!category) {
//       return res.status(404).json({ message: "Category not found." });
//     }

//     res.status(200).json(category);
//   } catch (error) {
//     res.status(500).json({ message: "Error fetching category.", error });
//   }
// };


exports.getSchoolercategoryById = async (req, res) => {
  try {
    const category = await Schoolercategory.findById(req.params.id)
      .populate("createdBy", "firstName lastName email");

    if (!category) {
      return res.status(404).json({ message: "Category not found." });
    }

  
    let isUpdated = false;

    for (let i = 0; i < category.examType.length - 1; i++) {
      const currentParticipants = category.examType[i].participants;

      if (
        currentParticipants !== undefined &&
        currentParticipants !== null
      ) {
      
        if (category.examType[i + 1].groupSize !== currentParticipants) {
          category.examType[i + 1].groupSize = currentParticipants;
          isUpdated = true;
        }
      }
    }

    if (isUpdated) {
      await category.save();
    }
   

    res.status(200).json(category);
  } catch (error) {
    res.status(500).json({ message: "Error fetching category.", error });
  }
};



// exports.updateSchoolercategory = async (req, res) => {
//   try {
//     const { name ,price,groupSize , finalist,examSize } = req.body;
//     const category = await Schoolercategory.findByIdAndUpdate(
//       req.params.id,
//       { name ,price,groupSize , finalist,examSize },
//       { new: true }
//     );

//     if (!category) {
//       return res.status(404).json({ message: "Category not found." });
//     }

//     res.status(200).json({
//       message: "Category updated successfully.",
//       category,
//     });
//   } catch (error) {
//     res.status(500).json({ message: "Error updating category.", error });
//   }
// };




exports.updateSchoolercategory = async (req, res) => {
  try {
    const { name, price, groupSize, finalist, examSize } = req.body;

    // category exists?
    let category = await Schoolercategory.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: "Category not found." });
    }

    // Update simple fields
    if (name) category.name = name;
    if (price) category.price = price;
    if (groupSize) category.groupSize = groupSize;
    if (finalist) category.finalist = finalist;

    // Check examSize changed
    if (examSize && examSize !== category.examSize) {

      // Update examSize
      category.examSize = examSize;

      // Regenerate examType
      let examType = [];
      for (let i = 1; i <= examSize; i++) {
        examType.push({
          name: `Exam ${i}`,
          id: new mongoose.Types.ObjectId().toString(),
          count: i
        });
      }

      category.examType = examType;
    }

    await category.save();

    res.status(200).json({
      message: "Category updated successfully.",
      category
    });

  } catch (error) {
    res.status(500).json({ 
      message: "Error updating category.", 
      error: error.message 
    });
  }
};



exports.deleteSchoolercategory = async (req, res) => {
  try {
    const category = await Schoolercategory.findByIdAndDelete(req.params.id);

    if (!category) {
      return res.status(404).json({ message: "Category not found." });
    }

    res.status(200).json({ message: "Category deleted successfully." });
  } catch (error) {
    res.status(500).json({ message: "Error deleting category.", error });
  }
};


exports.getExamTypeByCategoryId = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Schoolercategory.findById(id).select("examType");

    if (!category) {
      return res.status(404).json({ message: "Category not found." });
    }

    return res.status(200).json({
      message: "ExamType fetched successfully.",
      examType: category.examType
    });

  } catch (error) {
    res.status(500).json({
      message: "Error fetching examType.",
      error: error.message
    });
  }
};


exports.createSchoolergroup = async (req, res) => {
  try {
    const { category, seat } = req.body;
    const createdBy = req.user?._id; 
    if (!category || !seat) {
      return res.status(400).json({ message: "Category and seat are required." });
    }
 
    const newGroup = new Schoolergroup({ category, seat, createdBy });
    await newGroup.save();
    res.status(201).json({
      message: "Group created successfully.",
      group: newGroup,
    });
  } catch (error) {
    res.status(500).json({ message: "Error creating group.", error });
  }
};




// exports.getAllSchoolergroups = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     let { examType } = req.query;

//     // 🟢 Convert examType string → ObjectId
//     if (examType && mongoose.Types.ObjectId.isValid(examType)) {
//       examType = new mongoose.Types.ObjectId(examType);
//     }

//     const categories = await Schoolercategory.find()
//       .populate("createdBy", "firstName lastName email")
//       .sort({ createdAt: 1 });

//     const updatedCategories = [];

//     for (const category of categories) {
//       if (!category.price || !category.groupSize) continue;
//       const categoryObj = category.toObject();

//       // Agar examType nahi diya
//       if (!examType) {
//         categoryObj.seat = category.groupSize;
//       } else {
//         const allExams = await Schoolerexam.find({ category: category._id })
//           .sort({ createdAt: 1 })
//           .lean();

//         if (allExams.length === 0) {
//           categoryObj.seat = category.groupSize;
//         } else {
//           const examTypeList = allExams.map(ex => ex.examType.toString());

//           // Compare using string (safe)
//           const index = examTypeList.indexOf(examType.toString());

//           if (index !== -1) {
//             // SAME examType found → INITIAL seat
//             categoryObj.seat = category.groupSize;
//           } else {
//             // Not found → last passout
//             categoryObj.seat = allExams[allExams.length - 1].passout;
//           }
//         }
//       }

//       updatedCategories.push(categoryObj);
//     }

//     res.status(200).json(updatedCategories);

//   } catch (error) {
//     res.status(500).json({ message: "Error fetching categories", error: error.message });
//   }
// };

exports.getAllSchoolergroups = async (req, res) => {
  try {
    const userId = req.user._id;
    let { examType } = req.query;

    // Convert examType to ObjectId
    if (examType && mongoose.Types.ObjectId.isValid(examType)) {
      examType = new mongoose.Types.ObjectId(examType);
    }

    // Get all categories
    const categories = await Schoolercategory.find()
      .populate("createdBy", "firstName lastName email")
      .sort({ createdAt: 1 });

    // Get all saved categories of this user
    const userTopCategories = await CategoryTopUser.find({ userId }).lean();
    const savedCategoryIds = userTopCategories.map(entry => entry.categoryId.toString());

    // Find last saved category index
    let lastSavedIndex = -1;
    for (let i = 0; i < categories.length; i++) {
      if (savedCategoryIds.includes(categories[i]._id.toString())) {
        lastSavedIndex = i;
      }
    }

    const updatedCategories = [];

    for (let i = 0; i < categories.length; i++) {
      const category = categories[i];
      if (!category.price || !category.groupSize) continue;

      const categoryObj = category.toObject();

      // --------------------------------------
      // ⭐ SEAT LOGIC (Original full logic)
      // --------------------------------------
      if (!examType) {
        categoryObj.seat = category.groupSize;
      } else {
        const allExams = await Schoolerexam.find({ category: category._id })
          .sort({ createdAt: 1 })
          .lean();

        if (allExams.length === 0) {
          categoryObj.seat = category.groupSize;
        } else {
          const examTypeList = allExams.map(ex => ex.examType.toString());
          const index = examTypeList.indexOf(examType.toString());

          if (index !== -1) {
            // Same examType exists → give default seats
            categoryObj.seat = category.groupSize;
          } else {
            // Different examType → give last passout seat
            categoryObj.seat = allExams[allExams.length - 1].passout;
          }
        }
      }

      // --------------------------------------
      // ⭐ STATUS LOGIC (Your new logic)
      // --------------------------------------
      if (i === 0) {
        categoryObj.status = true;   // 1st category true
      } else if (i <= lastSavedIndex) {
        categoryObj.status = true;   // Till saved category true
      } else {
        categoryObj.status = false;  // Others false
      }

      updatedCategories.push(categoryObj);
    }

    res.status(200).json(updatedCategories);

  } catch (error) {
    res.status(500).json({ message: "Error fetching categories", error: error.message });
  }
};







exports.getSchoolergroupById = async (req, res) => {
  try {
    const group = await Schoolergroup.findById(req.params.id)
      .populate("category", "name")
      .populate("createdBy", "firstName lastName email");

    if (!group) {
      return res.status(404).json({ message: "Group not found." });
    }

    res.status(200).json(groups || []);
  } catch (error) {
    res.status(500).json({ message: "Error fetching group.", error });
  }
};

exports.updateSchoolergroup = async (req, res) => {
  try {
    const { category, seat } = req.body;
    const group = await Schoolergroup.findByIdAndUpdate(
      req.params.id,
      { category, seat },
      { new: true }
    );

    if (!group) {
      return res.status(404).json({ message: "Group not found." });
    }

    res.status(200).json({
      message: "Group updated successfully.",
      group,
    });
  } catch (error) {
    res.status(500).json({ message: "Error updating group.", error });
  }
};

exports.deleteSchoolergroup = async (req, res) => {
  try {
    const group = await Schoolergroup.findByIdAndDelete(req.params.id);

    if (!group) {
      return res.status(404).json({ message: "Group not found." });
    }

    res.status(200).json({ message: "Group deleted successfully." });
  } catch (error) {
    res.status(500).json({ message: "Error deleting group.", error });
  }
};











exports.updateParticipantsToExam = async (req, res) => {
  try {
    const examTypeId = req.params.id; 
    const { participants } = req.body;

    if (!examTypeId) {
      return res.status(400).json({
        message: "examTypeId is required."
      });
    }

    
    if (participants === undefined) {
      return res.status(400).json({
        message: "participants is required to update."
      });
    }

    if (isNaN(participants) || participants < 0) {
      return res.status(400).json({
        message: "participants must be a valid number."
      });
    }

    const result = await Schoolercategory.findOneAndUpdate(
      { "examType.id": examTypeId },
      {
        $set: {
          "examType.$.participants": Number(participants)
        }
      },
      { new: true }
    );

    if (!result) {
      return res.status(404).json({
        message: "No category found for given examTypeId."
      });
    }

    const updatedExam = result.examType.find(
      (ex) => ex.id === examTypeId
    );

    return res.status(200).json({
      message: "Participants updated successfully.",
      examType: updatedExam
    });

  } catch (error) {
    return res.status(500).json({
      message: "Error updating participants.",
      error: error.message
    });
  }
};

