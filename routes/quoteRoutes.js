const express = require('express');
const router = express.Router();
const quoteController = require('../controllers/quotesController');
const auth = require('../middleware/auth');
router.post('/quotes',auth, quoteController.createQuote);
router.get('/quotes', quoteController.getQuotes);
router.put('/quotes/:id', quoteController.updateQuote);
router.put('/statusquotes/:id', quoteController.StatusUpdateQuote);
router.delete('/quotes/:id', quoteController.deleteQuote);
router.get('/PublishedQuotes', quoteController.getPublishedQuotes);


module.exports = router;
