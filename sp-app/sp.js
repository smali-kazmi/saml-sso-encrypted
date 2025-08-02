const saml = require('samlify');
const fs = require('fs');
const { BASE_URL } = require('./constants');

// Load environment variables (with fallback for existing setups)
require('dotenv').config();
const ENABLE_ENCRYPTION = process.env.ENABLE_ENCRYPTION === 'true';

console.log('🔐 SP Encryption Mode:', ENABLE_ENCRYPTION ? 'ENABLED' : 'DISABLED');

const sp = saml.ServiceProvider({
    entityID: `${BASE_URL}/metadata`,
    assertionConsumerService: [{
        Binding: saml.Constants.namespace.binding.post,
        Location: `${BASE_URL}/assert`
    }],
    singleLogoutService: [{
        Binding: saml.Constants.namespace.binding.redirect,
        Location: `${BASE_URL}/slo`
    }],
    privateKey: fs.readFileSync('./sp-signing.key'),
    signingCert: fs.readFileSync('./sp-signing.cert'),
    // Only include encryption keys if encryption is enabled
    ...(ENABLE_ENCRYPTION && {
        encPrivateKey: fs.readFileSync('./sp-encrypt.key'),
        encryptCert: fs.readFileSync('./sp-encrypt.cert')
    }),
    // Configure for proper signature verification
    wantAssertionsSigned: false,  // Assertions can be signed but not required
    wantResponseSigned: true,     // Responses should be signed
    requestSignatureAlgorithm: 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256',
    validateInResponseTo: true,
    allowCreate: true,
    isAssertionEncrypted: ENABLE_ENCRYPTION
});
module.exports = sp;