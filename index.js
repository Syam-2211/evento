const app = require('./src/app');
const { connectDB } = require('./src/config/db');

const PORT = process.env.PORT || 3000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`Facial Recognition & NFC Access Control Server Running`);
    console.log(`Port: ${PORT}`);
    console.log(`URL:  http://localhost:${PORT}`);
    console.log(`====================================================`);
  });
});
