#!/usr/bin/env node

const axios = require('axios');
const { JSDOM } = require('jsdom');

async function testSAMLFlow() {
    console.log('🚀 Starting SAML Flow Test...\n');

    try {
        // Step 1: Check if both applications are running
        console.log('1️⃣ Checking application health...');

        const idpHealth = await axios.get('http://localhost:3000/metadata').catch(() => null);
        const spHealth = await axios.get('http://localhost:4000/metadata').catch(() => null);

        if (!idpHealth) {
            console.log('❌ IdP application (port 3000) is not running');
            return;
        }
        if (!spHealth) {
            console.log('❌ SP application (port 4000) is not running');
            return;
        }

        console.log('✅ Both IdP and SP applications are running\n');

        // Step 2: Start the SAML login flow
        console.log('2️⃣ Initiating SAML login flow...');

        const loginResponse = await axios.get('http://localhost:4000/login', {
            maxRedirects: 0,
            validateStatus: (status) => status === 302
        });

        console.log('✅ Login redirect received');
        console.log('📍 Redirect location:', loginResponse.headers.location);

        // Step 3: Follow the redirect to IdP
        console.log('\n3️⃣ Following redirect to IdP...');

        const idpResponse = await axios.get(loginResponse.headers.location);
        console.log('✅ IdP response received');

        // Step 4: Parse the SAML response form
        console.log('\n4️⃣ Parsing SAML response form...');

        const dom = new JSDOM(idpResponse.data);
        const document = dom.window.document;

        const form = document.querySelector('form');
        const samlResponseInput = document.querySelector('input[name="SAMLResponse"]');
        const relayStateInput = document.querySelector('input[name="RelayState"]');

        if (!form || !samlResponseInput) {
            console.log('❌ Could not find SAML response form');
            console.log('Response content:', idpResponse.data.substring(0, 500));
            return;
        }

        const formAction = form.getAttribute('action');
        const samlResponse = samlResponseInput.getAttribute('value');
        const relayState = relayStateInput ? relayStateInput.getAttribute('value') : '';

        console.log('✅ SAML response form parsed');
        console.log('📍 Form action:', formAction);
        console.log('📄 SAML Response length:', samlResponse.length, 'characters');

        // Step 5: Submit the SAML response to SP
        console.log('\n5️⃣ Submitting SAML response to SP...');

        const formData = new URLSearchParams();
        formData.append('SAMLResponse', samlResponse);
        if (relayState) {
            formData.append('RelayState', relayState);
        }

        const spResponse = await axios.post(formAction, formData, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        console.log('✅ SP response received');
        console.log('📊 Response status:', spResponse.status);
        console.log('📏 Response length:', spResponse.data.length, 'characters');

        // Step 6: Analyze the result
        console.log('\n6️⃣ Analyzing SAML flow result...');

        if (spResponse.data.includes('Login Successful!')) {
            console.log('🎉 SUCCESS: SAML flow completed successfully!');

            // Extract user info from success page
            const nameIDMatch = spResponse.data.match(/<strong>Name ID:<\/strong>\s*([^<]+)/);
            if (nameIDMatch) {
                console.log('👤 Name ID:', nameIDMatch[1].trim());
            }

            // Look for attributes
            const attributesMatch = spResponse.data.match(/<pre>([^<]+)<\/pre>/);
            if (attributesMatch) {
                console.log('📋 Attributes:', attributesMatch[1].trim());
            }

        } else if (spResponse.data.includes('SAML Assertion Error')) {
            console.log('❌ SAML Assertion Error detected');

            // Extract error message
            const errorMatch = spResponse.data.match(/SAML Assertion Error:\s*([^<]+)/);
            if (errorMatch) {
                console.log('🔍 Error:', errorMatch[1].trim());
            }

            console.log('\n📄 Full error response:');
            console.log(spResponse.data);

        } else {
            console.log('⚠️ Unexpected response from SP');
            console.log('📄 Response preview:', spResponse.data.substring(0, 500));
        }

    } catch (error) {
        console.log('💥 Test failed with error:');
        console.log('🔍 Error message:', error.message);

        if (error.response) {
            console.log('📊 HTTP Status:', error.response.status);
            console.log('📄 Response data:', error.response.data?.substring?.(0, 500) || error.response.data);
        }
    }

    console.log('\n🏁 SAML Flow Test Complete');
}

// Run the test
if (require.main === module) {
    testSAMLFlow();
}

module.exports = testSAMLFlow;
