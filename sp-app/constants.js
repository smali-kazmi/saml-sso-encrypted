require('dotenv').config();

const PORT = process.env.PORT || 4000;
const BASE_URL = process.env.BASE_URL || 'http://localhost:4000';
const IDP_METADATA_URL = process.env.IDP_METADATA_URL || 'http://localhost:3000/metadata';

module.exports = {
    PORT,
    BASE_URL,
    IDP_METADATA_URL,
};