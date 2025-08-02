#!/usr/bin/env node

const axios = require('axios');

async function debugSAMLResponse() {
    console.log('🔍 Debugging SAML Response Structure...\n');

    try {
        // Get a fresh SAML response
        const loginResponse = await axios.get('http://localhost:4000/login', {
            maxRedirects: 0,
            validateStatus: (status) => status === 302
        });

        const idpResponse = await axios.get(loginResponse.headers.location);
        const samlResponseMatch = idpResponse.data.match(/name="SAMLResponse" value="([^"]+)"/);

        if (!samlResponseMatch) {
            console.log('❌ Could not extract SAML response');
            return;
        }

        const samlResponse = samlResponseMatch[1];
        const decoded = Buffer.from(samlResponse, 'base64').toString();

        console.log('📄 Decoded SAML Response:');
        console.log('='.repeat(80));
        console.log(decoded);
        console.log('='.repeat(80));

        // Check for signature elements
        const hasSignature = decoded.includes('<ds:Signature');
        const hasSignedInfo = decoded.includes('<ds:SignedInfo');
        const hasSignatureValue = decoded.includes('<ds:SignatureValue');

        console.log('\n🔍 Signature Analysis:');
        console.log('- Contains <ds:Signature>:', hasSignature);
        console.log('- Contains <ds:SignedInfo>:', hasSignedInfo);
        console.log('- Contains <ds:SignatureValue>:', hasSignatureValue);

        if (hasSignature) {
            console.log('\n⚠️ The response is still being signed by the IdP!');
            console.log('💡 We need to properly disable signing at the IdP level.');
        } else {
            console.log('\n✅ The response is not signed - the issue might be elsewhere.');
        }

    } catch (error) {
        console.log('💥 Error:', error.message);
    }
}

debugSAMLResponse();
