const authController = require('./src/controllers/authController');

const req = { body: { phone: '+917982637619', pin: '123456' } };
const res = { 
  status: (c) => ({ json: (d) => console.log('STATUS', c, d) }), 
  json: (d) => console.log('JSON', d) 
};
const next = (err) => console.error('NEXT ERROR:', err);

authController.pinLogin(req, res, next);
