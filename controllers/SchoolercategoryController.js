const Schoolercategory = require("../models/schoolershipcategory");
const Schoolergroup = require("../models/Schoolergroup");
const Schoolerexam = require("../models/Schoolerexam");
const ExamResult = require("../models/examResult");
const CategoryTopUser = require("../models/CategoryTopUser");

exports.createSchoolercategory = async (req, res) => {
  try {
    const { name, price,groupSize , finalist } = req.body;
    const createdBy = req.user?._id;

   if (!name || !price || !groupSize || !finalist) {
      return res.status(400).json({ 
        message: "All fields (name, price, groupSize, finalist) are required." 
      });
    }
    // ✅ Create new category with price
    const newCategory = new Schoolercategory({
      name,
      price,
      groupSize , 
      finalist ,
      createdBy,
    });

    await newCategory.save();

    res.status(201).json({
      message: "Category created successfully.",
      category: newCategory,
    });
  } catch (error) {
    res.status(500).json({ message: "Error creating category.", error: error.message });
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

exports.updateSchoolercategory = async (req, res) => {
  try {
    const { name ,price,groupSize , finalist } = req.body;
    const category = await Schoolercategory.findByIdAndUpdate(
      req.params.id,
      { name ,price,groupSize , finalist },
      { new: true }
    );

    if (!category) {
      return res.status(404).json({ message: "Category not found." });
    }

    res.status(200).json({
      message: "Category updated successfully.",
      category,
    });
  } catch (error) {
    res.status(500).json({ message: "Error updating category.", error });
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
//     const userId = req.user._id; // ✅ Logged-in user
//     const categories = await Schoolercategory.find()
//       .populate("createdBy", "firstName lastName email")
//       .sort({ createdAt: 1 });

//     const updatedCategories = [];
//     let allowNext = true; // ✅ First category open by default

//     for (const category of categories) {
//       if (category.price && category.groupSize) {
//         const categoryObj = category.toObject();

//         // ✅ Get last Exam of this category
//         const latestExam = await Schoolerexam.findOne({ category: category._id })
//           .sort({ createdAt: -1 })
//           .lean();

//         // ✅ Set seat value
//         categoryObj.seat = latestExam?.passout ?? category.groupSize;

//         // ✅ Default status = false
//         categoryObj.status = false;

//         if (allowNext === true) {
//           categoryObj.status = true; // First unlocked or last passed category
//         }

//         if (latestExam) {
//           // ✅ Check if user topped in last exam
//           const topUsers = await ExamResult.find({ examId: latestExam._id })
//             .sort({ percentage: -1, createdAt: 1 })
//             .limit(categoryObj.seat)
//             .select("userId")
//             .lean();

//           const userTop = topUsers.some((u) => u.userId.toString() === userId.toString());

//           // ✅ If user topped → next category unlock hoga
//           if (userTop) {
//             allowNext = true;
//           } else {
//             allowNext = false;
//           }
//         } else {
//           // ✅ Agar exam hi nahi hua → pehli category open, baaki close
//           if (updatedCategories.length === 0) allowNext = true;
//           else allowNext = false;
//         }

//         updatedCategories.push(categoryObj);
//       }
//     }

//     res.status(200).json(updatedCategories);
//   } catch (error) {
//     console.error("❌ Error fetching categories:", error);
//     res.status(500).json({ message: "Error fetching categories.", error: error.message });
//   }
// };

exports.getAllSchoolergroups = async (req, res) => {
  try {
    const userId = req.user._id; // ✅ Logged-in user
    const categories = await Schoolercategory.find()
      .populate("createdBy", "firstName lastName email")
      .sort({ createdAt: 1 });

    const updatedCategories = [];
    let allowNext = true; // ✅ First category open by default

    for (const category of categories) {
      if (category.price && category.groupSize) {
        const categoryObj = category.toObject();

        // ✅ Get last Exam of this category
        const latestExam = await Schoolerexam.findOne({ category: category._id })
          .sort({ createdAt: -1 })
          .lean();

        // ✅ Set seat value
        categoryObj.seat = latestExam?.passout ?? category.groupSize;

        // ✅ Default status = false
        categoryObj.status = false;

        // ✅ Category unlocked if previous category passed
        if (allowNext === true) {
          categoryObj.status = true;
        }

        if (latestExam) {
          // ✅ Check topper in this category
          const userTop = await CategoryTopUser.findOne({
            userId,
            categoryId: category._id,
          });

          // ⚡️ FIXED: unlock NEXT category (not this one)
          allowNext = !!userTop; 
        } else {
          // ✅ Agar exam hi nahi hua → pehli category open, baaki close
          if (updatedCategories.length === 0) allowNext = true;
          else allowNext = false;
        }

        updatedCategories.push(categoryObj);
      }
    }

    res.status(200).json(updatedCategories);
  } catch (error) {
    console.error("❌ Error fetching categories:", error);
    res.status(500).json({ message: "Error fetching categories.", error: error.message });
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