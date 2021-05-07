const { response } = require('express');
const MNM = require('../lib/mnm');
const express = require('express');
const router = express.Router();

router.get('/getChargepoints', async (req, res, next) => {
  const responseData = await MNM.getChargepoints();
  res.send(responseData);
});

router.get('/getLastChargeSessions', async (req, res, next) => {
  const responseData = await MNM.getLastChargeSessions();
  res.send(responseData);
})

router.get('/getTotalUsage', async (req, res, next) => {
  const responseData = await MNM.getTotalUsage();
  res.send(responseData);
})

module.exports = router;
