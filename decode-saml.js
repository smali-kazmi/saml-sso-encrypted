const fs = require('fs');

// Read the SAML response from the form we saved
const formHtml = fs.readFileSync('saml_form.html', 'utf8');
const samlResponseMatch = formHtml.match(/name="SAMLResponse" value="([^"]+)"/);

if (samlResponseMatch) {
    const encodedResponse = samlResponseMatch[1];
    console.log('📄 Encoded SAML Response length:', encodedResponse.length);

    try {
        // Decode base64
        const decodedResponse = Buffer.from(encodedResponse, 'base64').toString('utf8');
        console.log('✅ Decoded SAML Response:');
        console.log('📏 Length:', decodedResponse.length);

        // Save decoded response
        fs.writeFileSync('decoded-saml-response.xml', decodedResponse);
        console.log('💾 Saved to decoded-saml-response.xml');

        // Look for attribute statements
        if (decodedResponse.includes('AttributeStatement')) {
            console.log('✅ AttributeStatement found in response');
        } else {
            console.log('⚠️ No AttributeStatement found in response');
        }

        // Look for NameID
        if (decodedResponse.includes('NameID')) {
            console.log('✅ NameID found in response');
        } else {
            console.log('⚠️ No NameID found in response');
        }

        // Look for encrypted assertion
        if (decodedResponse.includes('EncryptedAssertion')) {
            console.log('🔒 Encrypted assertion detected - attributes are encrypted');
        }

    } catch (err) {
        console.log('❌ Error decoding SAML response:', err.message);
    }
} else {
    console.log('❌ Could not find SAML response in form');
}
