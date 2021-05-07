const { response } = require('express');
const MNM = require('../lib/mnm');
const express = require('express');
const router = express.Router();

/* GET users listing. */
router.get('/getUser', async (req, res, next) => {
  const responseData = await MNM.getUser();
  res.send(responseData);
});

module.exports = router;
