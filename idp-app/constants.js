require('dotenv').config();

const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

module.exports = {
    PORT,
    BASE_URL,
};