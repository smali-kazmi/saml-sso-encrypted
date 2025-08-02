const axios = require('axios');
const fs = require('fs');

async function debugSAMLPost() {
    try {
        console.log('🚀 Starting SAML POST debug...');

        // Get the SAML form from IdP
        const loginResponse = await axios.get('http://localhost:4000/login', {
            maxRedirects: 0,
            validateStatus: () => true
        });

        const redirectUrl = loginResponse.headers.location;
        console.log('📍 Redirect URL:', redirectUrl);

        // Follow the redirect to get the SAML form
        const idpResponse = await axios.get(redirectUrl);
        const formHtml = idpResponse.data;

        // Extract SAML Response using regex
        const samlResponseMatch = formHtml.match(/name="SAMLResponse" value="([^"]+)"/);
        const relayStateMatch = formHtml.match(/name="RelayState" value="([^"]*)"/);
        const actionMatch = formHtml.match(/action="([^"]+)"/);

        if (!samlResponseMatch || !actionMatch) {
            console.log('❌ Could not extract SAML data from form');
            return;
        }

        const samlResponse = samlResponseMatch[1];
        const relayState = relayStateMatch ? relayStateMatch[1] : '';
        const action = actionMatch[1];

        console.log('✅ Extracted SAML data:');
        console.log('📍 Action:', action);
        console.log('📄 SAML Response length:', samlResponse.length);
        console.log('🔗 Relay State:', relayState);

        // POST the SAML response
        const formData = new URLSearchParams();
        formData.append('SAMLResponse', samlResponse);
        formData.append('RelayState', relayState);

        console.log('\n📤 Posting SAML response...');
        const spResponse = await axios.post(action, formData, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        console.log('✅ SP Response received');
        console.log('📊 Status:', spResponse.status);
        console.log('📏 Response length:', spResponse.data.length || JSON.stringify(spResponse.data).length);

        // Save response for analysis (handle both JSON and HTML)
        const responseContent = typeof spResponse.data === 'object'
            ? JSON.stringify(spResponse.data, null, 2)
            : spResponse.data;
        fs.writeFileSync('sp-response.json', responseContent);
        console.log('💾 Response saved to sp-response.json');

        // Handle JSON response
        if (typeof spResponse.data === 'object') {
            console.log('\n🔍 COMPREHENSIVE SAML DEBUG INFO:');
            console.log('='.repeat(50));

            if (spResponse.data.success) {
                console.log('🎉 SUCCESS: SAML flow completed successfully!');
                console.log('👤 Name ID:', spResponse.data.nameID);
                console.log('� Attributes:', JSON.stringify(spResponse.data.attributes, null, 2));
                console.log('📄 SAML Response Length:', spResponse.data.samlResponseLength);
                console.log('🔗 Relay State:', spResponse.data.relayState);
                console.log('⏰ Timestamp:', spResponse.data.timestamp);

                console.log('\n📊 RESULT STRUCTURE:');
                console.log('Result Keys:', spResponse.data.resultKeys);
                console.log('Extract Keys:', spResponse.data.extractKeys);

                console.log('\n🔍 FULL EXTRACT OBJECT:');
                console.log(JSON.stringify(spResponse.data.extractObject, null, 2));

            } else {
                console.log('❌ SAML Assertion Error');
                console.log('🔍 Error:', spResponse.data.error);
                console.log('📄 SAML Response Length:', spResponse.data.samlResponseLength);
                console.log('🔗 Relay State:', spResponse.data.relayState);
                console.log('⏰ Timestamp:', spResponse.data.timestamp);

                if (spResponse.data.errorStack) {
                    console.log('\n📚 Error Stack:');
                    console.log(spResponse.data.errorStack);
                }
            }

        } else {
            // Handle legacy HTML response
            if (spResponse.data.includes('Login Successful!')) {
                console.log('🎉 Login successful!');

                const nameIDMatch = spResponse.data.match(/<strong>Name ID:<\/strong>\s*([^<]+)/);
                if (nameIDMatch) {
                    console.log('👤 Name ID:', nameIDMatch[1].trim());
                }

                const attributesMatch = spResponse.data.match(/<pre>([^<]+)<\/pre>/);
                if (attributesMatch) {
                    console.log('📋 Attributes:', attributesMatch[1].trim());
                }
            } else {
                console.log('❌ Login failed or unexpected response');
                console.log('📄 Response preview:', spResponse.data.substring(0, 500));
            }
        }

    } catch (error) {
        console.log('💥 Error:', error.message);
        if (error.response) {
            console.log('📊 Status:', error.response.status);
            console.log('📄 Data:', error.response.data?.substring?.(0, 500) || error.response.data);
        }
    }
}

debugSAMLPost();
