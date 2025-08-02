const fs = require('fs');
const crypto = require('crypto');

console.log('🔐 Testing Certificate Compatibility...\n');

// Read the certificates
const idpSigningCert = fs.readFileSync('./idp-app/idp-signing.cert', 'utf8');
const idpSigningKey = fs.readFileSync('./idp-app/idp-signing.key', 'utf8');

console.log('📄 IdP Signing Certificate (first 100 chars):');
console.log(idpSigningCert.substring(0, 100) + '...\n');

// Test signing and verification
const testData = 'Hello SAML World!';

try {
    // Sign the test data
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(testData);
    const signature = sign.sign(idpSigningKey, 'base64');

    console.log('✅ Successfully signed test data');
    console.log('📝 Signature (first 50 chars):', signature.substring(0, 50) + '...\n');

    // Verify the signature
    const verify = crypto.createVerify('RSA-SHA256');
    verify.update(testData);
    const isValid = verify.verify(idpSigningCert, signature, 'base64');

    if (isValid) {
        console.log('✅ Signature verification PASSED');
        console.log('🎉 The IdP signing certificate can properly sign and verify data');
    } else {
        console.log('❌ Signature verification FAILED');
        console.log('⚠️ There may be an issue with the certificate/key pair');
    }

} catch (error) {
    console.log('❌ Error during certificate testing:', error.message);
}

console.log('\n' + '='.repeat(60));
console.log('🔍 Certificate Details Analysis:');

// Extract certificate details
try {
    const cert = new crypto.X509Certificate(idpSigningCert);
    console.log('📋 Subject:', cert.subject);
    console.log('📋 Issuer:', cert.issuer);
    console.log('📅 Valid From:', cert.validFrom);
    console.log('📅 Valid To:', cert.validTo);
    console.log('🔑 Public Key Algorithm:', cert.publicKey.asymmetricKeyType);
    console.log('🔢 Key Size:', cert.publicKey.asymmetricKeySize);
} catch (error) {
    console.log('❌ Error reading certificate details:', error.message);
}
