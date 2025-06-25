
const School = require('../models/school');
const College = require('../models/college');
const SimpleInstitution = require('../models/adminschool');
  
const AdminSchool = require('../models/adminschool');
const AdminCollege = require('../models/admincollege');



  exports.addInstitution = async (req, res) => {
    try {
      const { name, price, type } = req.body;
  
      if (!name || price === undefined || !type) {
        return res.status(400).json({ message: 'Name, price, and type are required.' });
      }
  
      if (typeof price !== 'number' || price < 0) {
        return res.status(400).json({ message: 'Price must be a positive number.' });
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
  

exports.getSchools = async (req, res) => {
    try {
      const schools = await School.find();
      res.status(200).json(schools);
    } catch (error) {
      console.error('Error fetching schools:', error);
      res.status(500).json({ message: 'Server error while fetching schools' });
    }
  };
  

  exports.getCollege = async (req, res) => {
    try {
      const colleges = await College.find();
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
      const schools = await School.find();
      const colleges = await College.find();
  
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



//   exports.getAdminSchool = async (req, res) => {
//   try {
//     const data = await AdminSchool.find()
//       .populate('className', 'name') 
//       .populate('createdBy', 'name email'); 

//     res.status(200).json({ message: 'AdminSchool prices fetched successfully.', data });
//   } catch (err) {
//     console.error('Error fetching:', err);
//     res.status(500).json({ message: 'Server error.', error: err.message });
//   }
// };

exports.getAdminSchool = async (req, res) => {
  try {
    const rawData = await AdminSchool.find()
      .populate('className', 'name')
      .populate('createdBy', 'name email');

    // Transform the data
    const data = rawData.map(item => ({
      _id: item._id,
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

    // Transform the response
    const data = rawData.map(item => ({
      _id: item._id,
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

//   exports.getAdminCollege = async (req, res) => {
//   try {
//     const data = await AdminCollege.find()
//       .populate('className', 'name') 
//       .populate('createdBy', 'name email'); 

//     res.status(200).json({ message: 'AdminCollege prices fetched successfully.', data });
//   } catch (err) {
//     console.error('Error fetching:', err);
//     res.status(500).json({ message: 'Server error.', error: err.message });
//   }
// };

exports.institutionPrices = async (req, res) => {
  try {
    const adminSchools = await AdminSchool.find()
      .populate('className', 'name')
      .populate('createdBy', 'name email');

    const adminColleges = await AdminCollege.find()
      .populate('className', 'name')
      .populate('createdBy', 'name email');

    // Transform each separately
    const formattedSchools = adminSchools.map(item => ({
      _id: item._id,
      name: item.className?.name || '',
      price: item.price,
      createdBy: item.createdBy,
      createdAt: item.createdAt,
      __v: item.__v,
      type: 'school'
    }));

    const formattedColleges = adminColleges.map(item => ({
      _id: item._id,
      name: item.className?.name || '',
      price: item.price,
      createdBy: item.createdBy,
      createdAt: item.createdAt,
      __v: item.__v,
      type: 'college'
    }));

    const institutes = [...formattedSchools, ...formattedColleges];

    res.status(200).json({ message: 'Institution prices fetched successfully.', institutes });
  } catch (error) {
    console.error('Error fetching admin schools and colleges:', error);
    res.status(500).json({ message: 'Server error while fetching data' });
  }
};


// exports.institutionPrices = async (req, res) => {
//   try {
//     const adminSchools = await AdminSchool.find()
//       .populate('className', 'name')
//       .populate('createdBy', 'name email');

//     const adminColleges = await AdminCollege.find()
//       .populate('className', 'name')
//       .populate('createdBy', 'name email');

//     // Combine both arrays
//     const institutes = [...adminSchools, ...adminColleges];

//     res.status(200).json({ institutes });
//   } catch (error) {
//     console.error('Error fetching admin schools and colleges:', error);
//     res.status(500).json({ message: 'Server error while fetching data' });
//   }
// };



 exports.updateInstitution = async (req, res) => {
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