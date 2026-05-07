const db = require('./src/db');
const { hashPassword } = require('./src/utils/auth');
const authController = require('./src/controllers/authController');

async function test() {
  try {
    await db.query("INSERT INTO users (full_name, phone, password_hash) VALUES (?, ?, ?)", ['Migrate Test', '+9100000000', 'firebase-abc']);
  } catch(e) {} // ignore if exists
  
  const req = { body: { phone: '+9100000000', pin: '654321' } };
  const res = { 
    status: (c) => ({ json: (d) => console.log('STATUS', c, d) }), 
    json: (d) => console.log('JSON', d) 
  };
  const next = (err) => console.error('NEXT ERROR:', err);
  
  await authController.pinLogin(req, res, next);
}
test();
