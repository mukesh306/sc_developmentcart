// controllers/schoolController.js

const School = require('../models/school');
exports.addSchool = async (req, res) => {
  try {
    const { type, price } = req.body;

    if (!type || price === undefined) {
      return res.status(400).json({ message: 'Type and price are required.' });
    }

    if (typeof price !== 'number' || price < 0) {
      return res.status(400).json({ message: 'Price must be a positive number.' });
    }

    const newSchool = new School({
      type,
      price,
      createdBy: req.user._id, 
    });

    await newSchool.save();

    res.status(201).json({ message: 'School added successfully.', school: newSchool });
  } catch (error) {
    console.error('Error adding school:', error);
    res.status(500).json({ message: 'Server error while adding school.' });
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
  
 
  exports.updateSchool = async (req, res) => {
    try {
      const { id } = req.params;
      const { type, price } = req.body;
  
      const updatedSchool = await School.findByIdAndUpdate(
        id,
        { type, price },
        { new: true }
      );
  
      if (!updatedSchool) {
        return res.status(404).json({ message: 'School not found' });
      }
  
      res.status(200).json({ message: 'School updated successfully', school: updatedSchool });
    } catch (error) {
      console.error('Error updating school:', error);
      res.status(500).json({ message: 'Server error while updating school' });
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