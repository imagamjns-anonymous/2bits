const ncc = require('@vercel/ncc');
const path = require('path');

ncc(path.join(__dirname, 'api', 'index.js'), {
  cache: false,
  sourceMap: false,
  watch: false
}).then(({ code, map, assets }) => {
  console.log("Build successful!");
  console.log("Assets:", Object.keys(assets));
}).catch((err) => {
  console.error("Build failed:", err);
});
