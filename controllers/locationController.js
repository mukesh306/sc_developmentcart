
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





exports.getAllLocations = async (req, res) => {
  try {
    const countries = await location.aggregate([
      { $match: { type: 'country' } },
      {
        $lookup: {
          from: 'locations',
          localField: '_id',
          foreignField: 'parent',
          as: 'states'
        }
      },
      {
        $unwind: {
          path: '$states',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: 'locations',
          localField: 'states._id',
          foreignField: 'parent',
          as: 'cities'
        }
      },
      {
        $group: {
          _id: '$_id',
          name: { $first: '$name' },
          type: { $first: '$type' },
          createdBy: { $first: '$createdBy' },
          states: {
            $push: {
              $cond: [
                { $gt: ['$$ROOT.states', null] },
                {
                  _id: '$states._id',
                  name: '$states.name',
                  type: '$states.type',
                  parent: '$states.parent',
                  cities: '$cities'
                },
                '$$REMOVE'
              ]
            }
          }
        }
      }
    ]);

    res.status(200).json(countries);
  } catch (error) {
    console.error('Error fetching location hierarchy:', error);
    res.status(500).json({ message: 'Server error while fetching location data.' });
  }
};





exports.deleteLocation = async (req, res) => {
  try {
    const { id } = req.params;

    const locationToDelete = await location.findById(id);
    if (!locationToDelete) {
      return res.status(404).json({ message: 'Location not found.' });
    }

    // Check for child locations
    const child = await location.findOne({ parent: id });
    if (child) {
      return res.status(400).json({
        message: `Cannot delete ${locationToDelete.type} because it has dependent ${child.type}(s).`,
      });
    }

    await location.findByIdAndDelete(id);
    res.status(200).json({ message: `${locationToDelete.type} deleted successfully.` });

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
