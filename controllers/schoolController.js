
const School = require('../models/school');
const College = require('../models/college');
const SimpleInstitution = require('../models/adminschool');
  
const AdminSchool = require('../models/adminschool');
const AdminCollege = require('../models/admincollege');
const jwt = require('jsonwebtoken');
const Admin = require('../models/admin1');
const moment = require('moment-timezone');

  exports.addInstitution = async (req, res) => {
    try {
      const { name, price, type } = req.body;
  
      if (!name ||  !type) {
        return res.status(400).json({ message: 'Name, and type are required.' });
      }
  
      if (!['college', 'school'].includes(type.toLowerCase())) {
        return res.status(400).json({ message: 'Invalid type. Type must be either "college" or "school".' });
      }
   
      const Model = type.toLowerCase() === 'college' ? College : School;
  
      const existing = await Model.findOne({ name: name.trim() });
      if (existing) {
        return res.status(400).json({ message: `${type.charAt(0).toUpperCase() + type.slice(1)} already exists.` });
      }
  
      const newInstitution = new Model({
        name: name.trim(),
        price,
        createdBy: req.user._id,
      });
  
      await newInstitution.save();
  
      res.status(201).json({ message: `${type.charAt(0).toUpperCase() + type.slice(1)} added successfully.`, data: newInstitution });
  
    } catch (error) {
      console.error('Error adding institution:', error);
      res.status(500).json({ message: 'Server error while adding institution.' });
    }
  };
  

exports.getSchoolsuser = async (req, res) => {
    try {
    const { price } = req.query; 
    const filter = {};
    if (price) {
      filter.price = { $ne: null }; 
    }
      const schools = await School.find(filter); 
      res.status(200).json(schools);
    } catch (error) {
      console.error('Error fetching schools:', error);
      res.status(500).json({ message: 'Server error while fetching schools' });
    }
  };
  

exports.getSchools = async (req, res) => {
  try {
    const { price } = req.query;
    const filter = {};

    if (price) {
      filter.price = { $ne: null }; // only where price is not null
    }

    let schools = await School.find(filter)
      .populate('updatedBy');

    // Get today's date in IST
    const today = moment().tz('Asia/Kolkata').startOf('day');

    for (let school of schools) {
      if (school.updatedBy && school.updatedBy.endDate) {
        const endDate = moment(school.updatedBy.endDate, 'DD-MM-YYYY')
          .tz('Asia/Kolkata')
          .startOf('day');

        if (endDate.isBefore(today)) {
          await School.updateOne(
            { _id: school._id },
            { $set: { price: null } }
          );
          school.price = null;
        }
      }
    }

    res.status(200).json(schools);
  } catch (error) {
    console.error('Error fetching schools:', error);
    res.status(500).json({ message: 'Server error while fetching schools' });
  }
};


exports.getCollege = async (req, res) => {
  try {
    const { price } = req.query; 
    const filter = {};
    if (price) {
      filter.price = { $ne: null }; 
    }

    let colleges = await College.find(filter)
      .populate('updatedBy');

    // Today's date in IST
    const today = moment().tz('Asia/Kolkata').startOf('day');

    for (let college of colleges) {
      if (college.updatedBy && college.updatedBy.endDate) {
        const endDate = moment(college.updatedBy.endDate, 'DD-MM-YYYY')
          .tz('Asia/Kolkata')
          .startOf('day');

        // If endDate is strictly before today → price null
        if (endDate.isBefore(today)) {
          await College.updateOne(
            { _id: college._id },
            { $set: { price: null } }
          );
          college.price = null; // reflect in API response
        }
      }
    }

    res.status(200).json(colleges);
  } catch (error) {
    console.error('Error fetching colleges:', error);
    res.status(500).json({ message: 'Server error while fetching colleges' });
  }
};


exports.getCollegeuser = async (req, res) => {
  try {
    const { price } = req.query; 
    const filter = {};
    if (price) {
      filter.price = { $ne: null }; 
    }
    const colleges = await College.find(filter);
    res.status(200).json(colleges);
  } catch (error) {
    console.error('Error fetching colleges:', error);
    res.status(500).json({ message: 'Server error while fetching colleges' });
  }
};

  exports.updateInstitution = async (req, res) => {
    try {
      const { id } = req.params;
      const { name, price, type } = req.body;
      if (!id || !type) {
        return res.status(400).json({ message: 'ID and type are required.' });
      }
  
      if (!['college', 'school'].includes(type.toLowerCase())) {
        return res.status(400).json({ message: 'Invalid type. Type must be either "college" or "school".' });
      }
      const Model = type.toLowerCase() === 'college' ? College : School;
      const institution = await Model.findById(id);
      if (!institution) {
        return res.status(404).json({ message: `${type.charAt(0).toUpperCase() + type.slice(1)} not found.` });
      }
  
      // Optional fields update
      if (name) institution.name = name.trim();
      if (price !== undefined) {
        if (typeof price !== 'number' || price < 0) {
          return res.status(400).json({ message: 'Price must be a positive number.' });
        }
        institution.price = price;
      }
  
      await institution.save();
  
      res.status(200).json({ message: `${type.charAt(0).toUpperCase() + type.slice(1)} updated successfully.`, data: institution });
  
    } catch (error) {
      console.error('Error updating institution:', error);
      res.status(500).json({ message: 'Server error while updating institution.' });
    }
  };
  
  exports.deleteSchool = async (req, res) => {
    try {
      const { id } = req.params;
  
      const deletedSchool = await School.findByIdAndDelete(id);
  
      if (!deletedSchool) {
        return res.status(404).json({ message: 'School not found' });
      }
  
      res.status(200).json({ message: 'School deleted successfully' });
    } catch (error) {
      console.error('Error deleting school:', error);
      res.status(500).json({ message: 'Server error while deleting school' });
    }
  };

 exports.institute = async (req, res) => {
  try {
    const { price } = req.query;
    const schoolFilter = {};
    const collegeFilter = {};
    if (price) {
      schoolFilter.price = { $ne: null };
      collegeFilter.price = { $ne: null };
    }

    const schools = await School.find(schoolFilter);
    const colleges = await College.find(collegeFilter);
    const institutes = [...schools, ...colleges];
    res.status(200).json({ institutes });
  } catch (error) {
    console.error('Error fetching schools and colleges:', error);
    res.status(500).json({ message: 'Server error while fetching data' });
  }
};

  exports.deleteCollege = async (req, res) => {
    try {
      const { id } = req.params;
      const deletedCollege = await College.findByIdAndDelete(id);
      if (!deletedCollege) {
        return res.status(404).json({ message: 'College not found' });
      } 
      res.status(200).json({ message: 'College deleted successfully' });
    } catch (error) {
      console.error('Error deleting College:', error);
      res.status(500).json({ message: 'Server error while deleting College' });
    }
  };


exports.createInstitutionPrice = async (req, res) => {
  try {
    const { className, price, type } = req.body;

    // === Validation ===
    if (!className || price === undefined || !type) {
      return res.status(400).json({ message: 'className, price, and type are required.' });
    }

    if (typeof price !== 'number' || price < 0) {
      return res.status(400).json({ message: 'Price must be a positive number.' });
    }

    const institutionType = type.toLowerCase();
    if (!['college', 'school'].includes(institutionType)) {
      return res.status(400).json({ message: 'Invalid type. Type must be either "college" or "school".' });
    }

    const Model = institutionType === 'college' ? AdminCollege : AdminSchool;
    const RefModel = institutionType === 'college' ? College : School;

    // === Check if referenced school/college exists ===
    const institutionExists = await RefModel.findById(className);
    if (!institutionExists) {
      return res.status(404).json({ message: `${type} not found.` });
    }

    // === Prevent duplicate entry for the same className ===
    const existing = await Model.findOne({ className });
    if (existing) {
      return res.status(400).json({ message: `Entry for this ${type} already exists.` });
    }

    const newInstitution = new Model({
      className,
      price,
      createdBy: req.user._id,
    });

    await newInstitution.save();

    res.status(201).json({
      message: `${type.charAt(0).toUpperCase() + type.slice(1)} price added successfully.`,
      data: newInstitution
    });

  } catch (error) {
    console.error('Error adding institution:', error);
    res.status(500).json({ message: 'Server error while adding institution.', error: error.message });
  }
};


exports.getAdminSchool = async (req, res) => {
  try {
    const rawData = await AdminSchool.find()
      .populate('className', 'name') 
      .populate('createdBy', 'name email');

    const data = rawData.map(item => ({
      _id: item._id,
      classNameId: item.className?._id || null,
      name: item.className?.name || '',
      price: item.price,
      createdBy: item.createdBy,
      createdAt: item.createdAt,
      __v: item.__v
    }));

    res.status(200).json({ message: 'AdminSchool prices fetched successfully.', data });
  } catch (err) {
    console.error('Error fetching:', err);
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
};


exports.getAdminCollege = async (req, res) => {
  try {
    const rawData = await AdminCollege.find()
      .populate('className', 'name')
      .populate('createdBy', 'name email');

    const data = rawData.map(item => ({
      _id: item._id,
      classNameId: item.className?._id || null,
      name: item.className?.name || '',
      price: item.price,
      createdBy: item.createdBy,
      createdAt: item.createdAt,
      __v: item.__v
    }));

    res.status(200).json({ message: 'AdminCollege prices fetched successfully.', data });
  } catch (err) {
    console.error('Error fetching:', err);
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
};


exports.institutionPrices = async (req, res) => {
  try {
    const adminSchools = await AdminSchool.find()
      .populate('className', 'name')
      .populate('createdBy', 'name email');

    const adminColleges = await AdminCollege.find()
      .populate('className', 'name')
      .populate('createdBy', 'name email');

    // Format School entries
    const formattedSchools = adminSchools.map(item => ({
      _id: item._id,
      classNameId: item.className?._id || null,
      name: item.className?.name || '',
      price: item.price,
      createdBy: item.createdBy,
      createdAt: item.createdAt,
      __v: item.__v,
      type: 'school'
    }));

    // Format College entries
    const formattedColleges = adminColleges.map(item => ({
      _id: item._id,
      classNameId: item.className?._id || null,
      name: item.className?.name || '',
      price: item.price,
      createdBy: item.createdBy,
      createdAt: item.createdAt,
      __v: item.__v,
      type: 'college'
    }));

    // Merge both
    const institutes = [...formattedSchools, ...formattedColleges];

    res.status(200).json({ message: 'Institution prices fetched successfully.', institutes });
  } catch (error) {
    console.error('Error fetching admin schools and colleges:', error);
    res.status(500).json({ message: 'Server error while fetching data' });
  }
};


exports.deleteAdminSchool = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await AdminSchool.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ message: 'AdminSchool entry not found.' });
    }

    res.status(200).json({ message: 'AdminSchool entry deleted successfully.' });
  } catch (error) {
    console.error('Error deleting AdminSchool:', error);
    res.status(500).json({ message: 'Server error.', error: error.message });
  }
};


exports.deleteAdminCollege = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await AdminCollege.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ message: 'AdminCollege entry not found.' });
    }

    res.status(200).json({ message: 'AdminCollege entry deleted successfully.' });
  } catch (error) {
    console.error('Error deleting AdminCollege:', error);
    res.status(500).json({ message: 'Server error.', error: error.message });
  }
};

 exports.updateInstitutionAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { className, price, type } = req.body;
    if (!type) {
      return res.status(400).json({ message: 'Type is required.' });
    }

    const institutionType = type.toLowerCase();
    if (!['college', 'school'].includes(institutionType)) {
      return res.status(400).json({ message: 'Invalid type. Must be "college" or "school".' });
    }

    if (price !== undefined && (typeof price !== 'number' || price < 0)) {
      return res.status(400).json({ message: 'Price must be a positive number.' });
    }

    const Model = institutionType === 'college' ? AdminCollege : AdminSchool;
    const RefModel = institutionType === 'college' ? College : School;

    const existingEntry = await Model.findById(id);
    if (!existingEntry) {
      return res.status(404).json({ message: 'Institution price entry not found.' });
    }

    if (className) {
      const validInstitute = await RefModel.findById(className);
      if (!validInstitute) {
        return res.status(404).json({ message: `${type} not found.` });
      }

      const duplicate = await Model.findOne({ className, _id: { $ne: id } });
      if (duplicate) {
        return res.status(400).json({ message: `Another entry for this ${type} already exists.` });
      }

      existingEntry.className = className;
    }

    if (price !== undefined) {
      existingEntry.price = price;
    }

    await existingEntry.save();

    res.status(200).json({
      message: `${type.charAt(0).toUpperCase() + type.slice(1)} price updated successfully.`,
      data: existingEntry
    });

  } catch (error) {
    console.error('Error updating institution price:', error);
    res.status(500).json({ message: 'Server error while updating institution.', error: error.message });
  }
};


// exports.setInstitutionPrice = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { price, type } = req.body;
//     const updatedBy = req.user?._id; 

//     if (!id || !type) {
//       return res.status(400).json({ message: 'ID and type are required.' });
//     }

//     if (typeof price !== 'number' || price < 0) {
//       return res.status(400).json({ message: 'Price must be a positive number.' });
//     }

//     if (!['college', 'school'].includes(type.toLowerCase())) {
//       return res.status(400).json({ message: 'Invalid type. Must be either "college" or "school".' });
//     }

//     const Model = type.toLowerCase() === 'college' ? College : School;
//     const institution = await Model.findById(id);

//     if (!institution) {
//       return res.status(404).json({ message: `${type} not found.` });
//     }

//     institution.price = price;
//     institution.updatedBy = updatedBy; 
//     await institution.save();

//     res.status(200).json({
//       message: `Price set successfully for ${type}.`,
//       data: institution
//     });

//   } catch (error) {
//     console.error('Error setting price:', error);
//     res.status(500).json({ message: 'Server error while setting price.' });
//   }
// };


exports.setInstitutionPrice = async (req, res) => {
  try {
    const { id } = req.params;
    const { price, type } = req.body;
    const updatedBy = req.user?._id;

    if (!id || !type) {
      return res.status(400).json({ message: 'ID and type are required.' });
    }

    if (typeof price !== 'number' || price < 0) {
      return res.status(400).json({ message: 'Price must be a positive number.' });
    }

    if (!['college', 'school'].includes(type.toLowerCase())) {
      return res.status(400).json({ message: 'Invalid type. Must be either "college" or "school".' });
    }

    const Model = type.toLowerCase() === 'college' ? College : School;
    const institution = await Model.findById(id);

    if (!institution) {
      return res.status(404).json({ message: `${type} not found.` });
    }

    institution.price = price;
    institution.updatedBy = updatedBy;
    await institution.save();

    res.status(200).json({
      message: `Price set successfully for ${type}.`,
      data: institution
    });

  } catch (error) {
    console.error('Error setting price:', error);
    res.status(500).json({ message: 'Server error while setting price.' });
  }
};


exports.deleteSchoolPrice = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admin can delete price.' });
    }
    const school = await School.findById(id);
    if (!school) {
      return res.status(404).json({ message: 'School not found.' });
    }
    school.price = null;
    school.updatedBy = req.user._id; 
    await school.save();

    res.status(200).json({ message: 'Price removed from school successfully.', data: school });

  } catch (error) {
    console.error('Error removing school price:', error);
    res.status(500).json({ message: 'Server error while removing price.' });
  }
};



exports.deleteCollegePrice = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admin can delete price.' });
    }

    const college = await College.findById(id);

    if (!college) {
      return res.status(404).json({ message: 'College not found.' });
    }

    college.price = null;
    college.updatedBy = req.user._id; 
    await college.save();

    res.status(200).json({ message: 'Price removed from college successfully.', data: college });

  } catch (error) {
    console.error('Error removing college price:', error);
    res.status(500).json({ message: 'Server error while removing price.' });
  }
};