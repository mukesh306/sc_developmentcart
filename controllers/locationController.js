
const location = require('../models/location');

exports.createLocation = async (req, res) => {
  try {
    const { name, type, parentId } = req.body;

    if (!name || !type) {
      return res.status(400).json({ message: 'Name and type are required.' });
    }

    if (!['country', 'state', 'city'].includes(type)) {
      return res.status(400).json({ message: 'Invalid location type.' });
    }

    // For state and city, parentId must be provided
    if ((type === 'state' || type === 'city') && !parentId) {
      return res.status(400).json({ message: 'Parent ID is required for state and city.' });
    }

    // Validate parent exists
    if (parentId) {
      const parent = await location.findById(parentId);
      if (!parent) {
        return res.status(400).json({ message: 'Parent location not found.' });
      }

      if (type === 'state' && parent.type !== 'country') {
        return res.status(400).json({ message: 'State must belong to a country.' });
      }

      if (type === 'city' && parent.type !== 'state') {
        return res.status(400).json({ message: 'City must belong to a state.' });
      }
    }

    
    const existing = await location.findOne({
      name: name.trim(),
      type,
    });

    if (existing) {
      return res.status(409).json({ message: `${type.charAt(0).toUpperCase() + type.slice(1)} "${name}" already exists.` });
    }

    const newLocation = new location({
      name: name.trim(),
      type,
      parent: parentId || null,
      createdBy: req.user._id,
    });

    await newLocation.save();

    res.status(201).json({ message: 'Location created successfully.', location: newLocation });
  } catch (error) {
    console.error('Error creating location:', error);
    res.status(500).json({ message: 'Server error while creating location.' });
  }
};

exports.getLocation = async (req, res) => {
  try {
    const { type, parentId } = req.query;
    if (!type) {
      return res.status(400).json({ message: 'Location type is required.' });
    }
    if (!['country', 'state', 'city'].includes(type)) {
      return res.status(400).json({ message: 'Invalid location type.' });
    }
    const filter = { type };
    if ((type === 'state' || type === 'city') && parentId) {
      filter.parent = parentId;
    }
    const locations = await location.find(filter).select('name type parent createdBy');
    res.status(200).json({ locations });
  } catch (error) {
    console.error('Error fetching locations:', error);
    res.status(500).json({ message: 'Server error while fetching locations.' });
  }
};


exports.deleteLocation = async (req, res) => {
  try {
    const { id } = req.params;

    const locationToDelete = await location.findById(id);
    if (!locationToDelete) {
      return res.status(404).json({ message: 'Location not found.' });
    }

    if (locationToDelete.type === 'city') {
      // City can be deleted anytime
      await location.findByIdAndDelete(id);
      return res.status(200).json({ message: 'City deleted successfully.' });
    }

    if (locationToDelete.type === 'state') {
      // Check if state has any cities
      const hasCities = await location.exists({ parent: id, type: 'city' });
      if (hasCities) {
        return res.status(400).json({ message: 'Cannot delete state because it has cities.' });
      }

      // Safe to delete state
      await location.findByIdAndDelete(id);
      return res.status(200).json({ message: 'State deleted successfully.' });
    }

    if (locationToDelete.type === 'country') {
      // Check for any states under country
      const states = await location.find({ parent: id, type: 'state' });

      if (states.length > 0) {
        // Check if any of those states have cities
        const stateIds = states.map(s => s._id);
        const cities = await location.find({ parent: { $in: stateIds }, type: 'city' });

        if (cities.length > 0) {
          return res.status(400).json({ message: 'Cannot delete country because it has states and cities.' });
        }

        return res.status(400).json({ message: 'Cannot delete country because it has states.' });
      }

      // Safe to delete country
      await location.findByIdAndDelete(id);
      return res.status(200).json({ message: 'Country deleted successfully.' });
    }

    // Fallback (should not happen)
    res.status(400).json({ message: 'Invalid location type.' });

  } catch (error) {
    console.error('Error deleting location:', error);
    res.status(500).json({ message: 'Server error while deleting location.' });
  }
};



exports.updateLocation = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, parentId } = req.body;

    const locationData = await location.findById(id);
    if (!locationData) {
      return res.status(404).json({ message: 'Location not found.' });
    }

    // Validate new parent if provided
    if (parentId) {
      const parent = await location.findById(parentId);
      if (!parent) {
        return res.status(400).json({ message: 'Parent location not found.' });
      }

      if (locationData.type === 'state' && parent.type !== 'country') {
        return res.status(400).json({ message: 'State must belong to a country.' });
      }

      if (locationData.type === 'city' && parent.type !== 'state') {
        return res.status(400).json({ message: 'City must belong to a state.' });
      }

      locationData.parent = parentId;
    }

    if (name) {
      locationData.name = name;
    }

    await locationData.save();

    res.status(200).json({ message: 'Location updated successfully.', location: locationData });
  } catch (error) {
    console.error('Error updating location:', error);
    res.status(500).json({ message: 'Server error while updating location.' });
  }
};
