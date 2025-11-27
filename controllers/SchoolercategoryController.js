const mongoose = require('mongoose');
const Schoolercategory = require("../models/schoolershipcategory");
const Schoolergroup = require("../models/Schoolergroup");
const Schoolerexam = require("../models/Schoolerexam");
const ExamResult = require("../models/examResult");
const CategoryTopUser = require("../models/CategoryTopUser");


// exports.createSchoolercategory = async (req, res) => {
//   try {
//     const { name, price,groupSize , finalist,examSize } = req.body;
//     const createdBy = req.user?._id;

//    if (!name || !price || !groupSize || !finalist ||!examSize) {
//       return res.status(400).json({ 
//         message: "All fields (name, price, groupSize, finalist,ExamSize) are required." 
//       });
//     }
//     // ✅ Create new category with price
//     const newCategory = new Schoolercategory({
//       name,
//       price,
//       groupSize , 
//       finalist ,
//       examSize ,
//       createdBy,
//     });

//     await newCategory.save();

//     res.status(201).json({
//       message: "Category created successfully.",
//       category: newCategory,
//     });
//   } catch (error) {
//     res.status(500).json({ message: "Error creating category.", error: error.message });
//   }
// };


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

    // Create examType array
    let examType = [];
    for (let i = 1; i <= examSize; i++) {
      examType.push({
        name: `Exam ${i}`,
        id: new mongoose.Types.ObjectId().toString(),
        count: i
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


exports.getSchoolercategoryById = async (req, res) => {
  try {
    const category = await Schoolercategory.findById(req.params.id)
      .populate("createdBy", "firstName lastName email");

    if (!category) {
      return res.status(404).json({ message: "Category not found." });
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
//     const categories = await Schoolercategory.find()
//       .populate("createdBy", "firstName lastName email")
//       .sort({ createdAt: 1 });

//     const updatedCategories = [];
//     let allowNext = true; 
//     for (const category of categories) {
//       if (category.price && category.groupSize) {
//         const categoryObj = category.toObject();

       
//         const latestExam = await Schoolerexam.findOne({ category: category._id })
//           .sort({ createdAt: -1 })
//           .lean();

        
//         categoryObj.seat = latestExam?.passout ?? category.groupSize;

        
//         categoryObj.status = false;

        
//         if (updatedCategories.length === 0) {
//           categoryObj.status = true;
//         }

       
//         const userTop = await CategoryTopUser.findOne({
//           userId,
//           categoryId: category._id,
//         });

        
//         if (userTop) {
//           categoryObj.status = true; 
//         } else {
          
//           allowNext = false;
//         }

//         updatedCategories.push(categoryObj);
//       }
//     }

//     res.status(200).json(updatedCategories);
//   } catch (error) {
//     console.error("❌ Error fetching categories:", error);
//     res
//       .status(500)
//       .json({ message: "Error fetching categories.", error: error.message });
//   }
// };


exports.getAllSchoolergroups = async (req, res) => {
  try {
    const userId = req.user._id;
    const { examType } = req.query;

    const categories = await Schoolercategory.find()
      .populate("createdBy", "firstName lastName email")
      .sort({ createdAt: 1 });

    const updatedCategories = [];

    for (const category of categories) {
      if (!category.price || !category.groupSize) continue;

      const categoryObj = category.toObject();

      // CASE 1: examType NOT provided → initial seats
      if (!examType) {
        categoryObj.seat = category.groupSize;
      } 
      else {
        // Get all exams of this category sorted by createdAt
        const allExams = await Schoolerexam.find({ category: category._id })
          .sort({ createdAt: 1 }) // oldest → latest
          .lean();

        if (allExams.length === 0) {
          categoryObj.seat = category.groupSize;
        } else {
          const examTypeList = allExams.map(ex => ex.examType);

          // CASE 2: examType exists in saved exams → initial seat
          if (examTypeList.includes(examType)) {
            categoryObj.seat = category.groupSize;
          } 
          // CASE 3: examType not exists → next/latest exam passout
          else {
            categoryObj.seat = allExams[allExams.length - 1].passout;
          }
        }
      }

      updatedCategories.push(categoryObj);
    }

    res.status(200).json(updatedCategories);

  } catch (error) {
    console.error("❌ Error fetching categories:", error);
    res.status(500).json({
      message: "Error fetching categories.",
      error: error.message,
    });
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