const { response } = require('express');
const MNM = require('../lib/mnm');
const express = require('express');
const router = express.Router();

router.get('/getChargeCards', async (req, res, next) => {
  const responseData = await MNM.getCards();
  res.send(responseData);
});

module.exports = router;
