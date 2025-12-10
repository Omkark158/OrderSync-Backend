const express = require('express');
const router = express.Router();
const {
  getProfile,
  updateProfile,
  updatePassword,
  addAddress,
  getAddresses,
  updateAddress,
  deleteAddress,
} = require('../controllers/userController');
const { protect } = require('../middleware/auth');
const { updateProfileValidator, addAddressValidator } = require('../validators/userValidator');
const validateRequest = require('../middleware/validateRequest');

// All routes are protected (require authentication)
router.use(protect);

// Profile routes
router.get('/profile', getProfile);
router.put('/profile', updateProfileValidator, validateRequest, updateProfile);
router.put('/update-password', updatePassword);

// Address routes
router.post('/address', addAddressValidator, validateRequest, addAddress);
router.get('/addresses', getAddresses);
router.put('/address/:addressId', updateAddress);
router.delete('/address/:addressId', deleteAddress);

module.exports = router;