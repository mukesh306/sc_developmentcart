
const School = require('../models/school');
const College = require('../models/college');
const SimpleInstitution = require('../models/adminInstitution');



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
    const { instuteId, price } = req.body;

    if (!instuteId || price == null) {
      return res.status(400).json({ message: 'Institute ID and price are required.' });
    }

    const newEntry = new SimpleInstitution({
      instuteId,
      price,
      createdBy: req.user._id
    });

    await newEntry.save();

    res.status(201).json({ message: 'Data saved successfully.', data: newEntry });
  } catch (err) {
    console.error('Error saving:', err);
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
};


exports.getAllInstitution = async (req, res) => {
  try {
    const entries = await SimpleInstitution.find().populate('createdBy', 'email role');

    const populatedData = await Promise.all(
      entries.map(async (entry) => {
        let instuteDetails = await School.findById(entry.instuteId).lean();
        if (!instuteDetails) {
          instuteDetails = await College.findById(entry.instuteId).lean();
        }

        return {
          ...entry.toObject(),
          instuteDetails: instuteDetails || null // add the full data
        };
      })
    );

    res.status(200).json({
      message: 'Data fetched successfully.',
      data: populatedData
    });
  } catch (err) {
    console.error('Error populating instuteId:', err);
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
};




exports.updateInstitution = async (req, res) => {
  try {
    const { id } = req.params;
    const { instuteId, price } = req.body;

    if (!id) {
      return res.status(400).json({ message: 'Entry ID is required in URL.' });
    }

    if (!instuteId && price == null) {
      return res.status(400).json({ message: 'At least one of instuteId or price is required to update.' });
    }

    const updateFields = {};
    if (instuteId) updateFields.instuteId = instuteId;
    if (price != null) {
      if (typeof price !== 'number' || price < 0) {
        return res.status(400).json({ message: 'Price must be a positive number.' });
      }
      updateFields.price = price;
    }

    const updatedEntry = await SimpleInstitution.findByIdAndUpdate(
      id,
      { $set: updateFields },
      { new: true }
    ).populate('createdBy', 'email role');

    if (!updatedEntry) {
      return res.status(404).json({ message: 'Institution price entry not found.' });
    }

    res.status(200).json({
      message: 'Institution data updated successfully.',
      data: updatedEntry
    });
  } catch (err) {
    console.error('Update error:', err);
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
};
