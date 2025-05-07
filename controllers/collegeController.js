const College = require('../models/college');

const School = require('../models/school')


exports.addCollege = async (req, res) => {
    try {
      const { type, price } = req.body;
  
      if (!type || price === undefined) {
        return res.status(400).json({ message: 'Type and price are required.' });
      }
  
      if (typeof price !== 'number' || price < 0) {
        return res.status(400).json({ message: 'Price must be a positive number.' });
      }
  
      
      const existingCollege = await College.findOne({ type: type.trim() });
      if (existingCollege) {
        return res.status(400).json({ message: 'College type already exists.' });
      }
  
      const newCollege = new College({
        type: type.trim(),
        price,
        createdBy: req.user._id,
      });
  
      await newCollege.save();
  
      res.status(201).json({ message: 'College added successfully.', college: newCollege });
    } catch (error) {
      console.error('Error adding college:', error);
      res.status(500).json({ message: 'Server error while adding college.' });
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


  exports.updateCollege = async (req, res) => {
    try {
      const { id } = req.params;
      const { type, price } = req.body;
  
      const updatedCollege = await College.findByIdAndUpdate(
        id,
        { type, price },
        { new: true }
      );
  
      if (!updatedCollege) {
        return res.status(404).json({ message: 'College not found' });
      }
  
      res.status(200).json({ message: 'College updated successfully', school: updatedCollege });
    } catch (error) {
      console.error('Error updating College:', error);
      res.status(500).json({ message: 'Server error while updating College' });
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


exports.institute = async (req, res) => {
  try {
    const schools = await School.find();
    const colleges = await College.find();
    res.status(200).json({
      schools,  
      colleges   
    });
  } catch (error) {
    console.error('Error fetching schools and colleges:', error);
    res.status(500).json({ message: 'Server error while fetching data' });
  }
};
