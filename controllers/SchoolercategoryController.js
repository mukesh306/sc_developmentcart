const Schoolercategory = require("../models/schoolershipcategory");
const Schoolergroup = require("../models/Schoolergroup");
const Schoolerexam = require("../models/Schoolerexam");

exports.createSchoolercategory = async (req, res) => {
  try {
    const { name, price,groupSize , finalist } = req.body;
    const createdBy = req.user?._id;

    if (!name) {
      return res.status(400).json({ message: "Name is required." });
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
//     const groups = await Schoolergroup.find()
//       .populate("category", "name price")
//       .populate("createdBy", "firstName lastName email")
//       .sort({ createdAt: 1 });

//     // ✅ Filter out groups where category is null
//     const filteredGroups = groups.filter(group => group.category !== null);

//     res.status(200).json(filteredGroups || []);
//   } catch (error) {
//     res.status(500).json({ message: "Error fetching groups.", error });
//   }
// };

exports.getAllSchoolergroups = async (req, res) => {
  try {
    const groups = await Schoolergroup.find()
      .populate("category", "name price")
      .populate("createdBy", "firstName lastName email")
      .sort({ createdAt: 1 });

    // ✅ Filter out groups where category is null
    const filteredGroups = groups.filter(group => group.category !== null);

    const updatedGroups = [];

    for (const group of filteredGroups) {
      const groupObj = group.toObject();

      try {
        // ✅ Only find latest exam if category exists
        let latestExam = null;
        if (group.category && group.category._id) {
          latestExam = await Schoolerexam.findOne({ category: group.category._id })
            .sort({ createdAt: -1 })
            .select("passout")
            .lean();
        }

        // ✅ Replace seat with latest exam passout if found
        if (latestExam && latestExam.passout !== undefined && latestExam.passout !== null) {
          groupObj.seat = latestExam.passout;
        }
      } catch (err) {
        console.error(`⚠️ Error processing group ${group._id}:`, err.message);
      }

      updatedGroups.push(groupObj);
    }

    res.status(200).json(updatedGroups || []);
  } catch (error) {
    console.error("🔥 Error fetching groups:", error);
    res.status(500).json({ message: "Error fetching groups.", error: error.message });
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