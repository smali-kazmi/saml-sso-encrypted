const { PORT, BASE_URL } = require('./constants');
const express = require('express');
const saml = require('samlify');
const { idp, createSPFromURL } = require('./idp');
const fs = require('fs');
const bodyParser = require('body-parser');
const zlib = require('zlib');

// Load environment variables
require('dotenv').config();
const ENABLE_ENCRYPTION = process.env.ENABLE_ENCRYPTION === 'true';

console.log('🚀 IdP Server Configuration:');
console.log('🔐 Encryption Mode:', ENABLE_ENCRYPTION ? 'ENABLED' : 'DISABLED');

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

// Configure samlify settings
saml.setSchemaValidator({
    validate: () => true // Disable strict schema validation for debugging
});

let sp;
async function getSP() {
    if (!sp) {
        sp = await createSPFromURL();
    }
    return sp;
}

// Reset SP cache when metadata changes
async function resetSP() {
    sp = null;
    return await getSP();
}

// Serve IdP metadata dynamically
app.get('/metadata', (req, res) => {
    res.type('application/xml');
    res.send(idp.getMetadata());
});

app.get('/sso', async (req, res) => {
    const sp = await getSP();
    if (!sp) return res.status(500).send('SP metadata not loaded.');
    try {
        const { SAMLRequest, RelayState } = req.query;
        console.log('Raw SAMLRequest:', SAMLRequest);
        console.log('RelayState:', RelayState);

        // Decode and inspect the SAML request
        if (SAMLRequest) {
            try {
                // First try base64 decode
                const base64Decoded = Buffer.from(SAMLRequest, 'base64');
                console.log('Base64 decoded length:', base64Decoded.length);

                // Try to inflate (decompress) - SAML requests are often deflated
                try {
                    const inflated = zlib.inflateRawSync(base64Decoded).toString('utf8');
                    console.log('Inflated SAMLRequest (first 500 chars):', inflated.substring(0, 500));
                } catch (inflateErr) {
                    console.log('Inflate failed:', inflateErr.message);
                    // If inflate fails, the data might be corrupted or use different compression
                    try {
                        const deflated = zlib.inflateSync(base64Decoded).toString('utf8');
                        console.log('Deflated SAMLRequest (first 500 chars):', deflated.substring(0, 500));
                    } catch (deflateErr) {
                        console.log('Both inflate methods failed');
                        const plainText = base64Decoded.toString('utf8');
                        console.log('Plain text SAMLRequest (first 100 chars):', plainText.substring(0, 100));
                    }
                }
            } catch (decodeErr) {
                console.log('Could not decode SAMLRequest:', decodeErr.message);
            }
        }

        // Reset SP to ensure fresh metadata loading
        const freshSP = await resetSP();

        if (!freshSP) {
            return res.status(500).send('Failed to load SP metadata after reset.');
        }

        console.log('About to parse login request...');
        console.log('SP entityID:', freshSP.entityMeta.getEntityID());
        console.log('IdP entityID:', idp.entityMeta.getEntityID());

        const parsed = await idp.parseLoginRequest(freshSP, 'redirect', req);
        console.log('Parsed SAML Request structure:', JSON.stringify(parsed, null, 2));
        console.log('Parsed keys:', Object.keys(parsed));

        // Check if parsed has the expected structure
        if (!parsed || !parsed.extract) {
            console.error('Invalid parsed structure. Expected extract property.');
            return res.status(500).send('Failed to parse SAML request properly.');
        }

        console.log('Extract object:', JSON.stringify(parsed.extract, null, 2));

        const user = {
            id: '123',
            email: 'user@example.com',
            displayName: 'Demo User',
            firstName: 'John',
            lastName: 'Doe',
            age: '30',
            gender: 'Male',
            username: 'johndoe'
        };

        // Use the entire parsed object as extractRequest
        console.log('Using parsed object as extractRequest');

        console.log('🎯 User object for SAML response:', JSON.stringify(user, null, 2));
        console.log('🔐 Encryption mode:', ENABLE_ENCRYPTION ? 'ENABLED' : 'DISABLED');

        let loginResponse;

        // Always use tag replacement for consistent attribute handling
        const tagReplacement = (template) => {
            const replaceTagsByValue = (rawXML, tagValues) => {
                return Object.keys(tagValues).reduce((xml, key) => {
                    return xml.replace(new RegExp(`{${key}}`, 'g'), tagValues[key]);
                }, rawXML);
            };

            const id = '_' + Math.random().toString(36).substr(2, 16);
            const now = new Date().toISOString();
            const notOnOrAfter = new Date(Date.now() + 5 * 60 * 1000).toISOString();

            // Get ACS location safely
            const acsServices = freshSP.entityMeta.getAssertionConsumerService();
            const acsLocation = acsServices && acsServices[0] ? acsServices[0].Location : 'http://localhost:4000/assert';
            const spEntityID = freshSP.entityMeta.getEntityID();

            const tagValues = {
                ID: id,
                AssertionID: '_' + Math.random().toString(36).substr(2, 16),
                IssueInstant: now,
                NotBefore: now,
                NotOnOrAfter: notOnOrAfter,
                Destination: acsLocation,
                InResponseTo: parsed.extract.request.id,
                Issuer: idp.entityMeta.getEntityID(),
                NameID: user.email,
                SubjectRecipient: acsLocation,
                Audience: spEntityID,
                // User attribute values
                email: user.email,
                displayName: user.displayName,
                firstName: user.firstName,
                lastName: user.lastName,
                age: user.age,
                gender: user.gender,
                username: user.username
            };

            console.log('🔧 Tag values for replacement:', JSON.stringify(tagValues, null, 2));
            const context = replaceTagsByValue(template, tagValues);

            return { id, context };
        };

        loginResponse = await idp.createLoginResponse(freshSP, parsed, 'post', user, tagReplacement); console.log('✅ Login response created successfully');
        console.log('📊 Login response keys:', Object.keys(loginResponse));
        console.log('📄 Login response type:', typeof loginResponse.context);
        console.log('📏 Login response context length:', loginResponse.context?.length || 0);

        // Get ACS URL from parsed request or SP metadata
        const acsUrl = parsed.extract?.request?.assertionConsumerServiceUrl ||
            freshSP.entityMeta.getAssertionConsumerService()[0].Location;
        res.send(`
      <form method="POST" action="${acsUrl}">
        <input type="hidden" name="SAMLResponse" value="${loginResponse.context}">
        <input type="hidden" name="RelayState" value="${RelayState}">
        <button type="submit">Continue</button>
      </form>
    `);

    } catch (err) {
        console.error('SSO Error Details:', {
            message: err?.message,
            stack: err?.stack,
            code: err?.code,
            name: err?.name,
            fullError: err
        });

        // If it's an XML error, let's also check the SP metadata
        const errorMessage = err?.message || err?.toString() || 'Unknown error';
        if (errorMessage.toLowerCase().includes('xml')) {
            console.log('SP metadata content:');
            try {
                const metadata = fs.readFileSync('./sp_metadata.xml', 'utf8');
                console.log(metadata.substring(0, 500) + '...');
            } catch (metaErr) {
                console.log('Could not read SP metadata:', metaErr?.message);
            }
        }

        res.status(500).send('SSO Error: ' + errorMessage);
    }
});

app.get('/slo', (req, res) => {
    res.send('IdP SLO endpoint');
});

// For demo: receive SP metadata and save it (optional)
app.post('/save-sp-metadata', bodyParser.urlencoded({ extended: false }), (req, res) => {
    fs.writeFileSync('./sp_metadata.xml', req.body.metadata);
    resetSP();
    res.send('SP metadata saved');
});

app.listen(PORT, () => {
    console.log(`IdP app listening on ${BASE_URL} (port ${PORT})`);
});