
const School = require('../models/school');
const College = require('../models/college');


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