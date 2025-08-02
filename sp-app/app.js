const { PORT, BASE_URL, IDP_METADATA_URL } = require('./constants');
const express = require('express');
const sp = require('./sp');
const saml = require('samlify');
const fs = require('fs');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

// Configure samlify for proper signature verification
console.log('🔧 Configuring samlify for proper signature verification...');
saml.setSchemaValidator({
    validate: () => true // Disable strict schema validation but allow signature verification
});

let idp;
let idpMetadata;

async function loadIdpMetadata() {
    console.log('🔄 Loading IdP metadata from:', IDP_METADATA_URL);
    const resp = await axios.get(IDP_METADATA_URL);
    idpMetadata = resp.data;
    console.log('✅ Loaded IdP metadata (first 500 chars):', idpMetadata.substring(0, 500));

    // Create IdP with metadata that includes signing certificates
    idp = saml.IdentityProvider({
        metadata: idpMetadata,
        // Ensure we want to verify signatures
        wantAuthnRequestsSigned: false,
        isAssertionEncrypted: true
    });

    console.log('✅ IdP entityID:', idp.entityMeta.getEntityID());

    // Check if the IdP has signing certificates
    try {
        const signingCerts = idp.entityMeta.getX509Certificate('signing');
        console.log('🔑 IdP signing certificates found:', signingCerts ? signingCerts.length : 0);
        if (signingCerts && signingCerts.length > 0) {
            console.log('🔑 First signing cert (100 chars):', signingCerts[0].substring(0, 100));
        }

        const encryptCerts = idp.entityMeta.getX509Certificate('encrypt');
        console.log('🔒 IdP encryption certificates found:', encryptCerts ? encryptCerts.length : 0);
    } catch (err) {
        console.log('⚠️ Error getting IdP certificates:', err.message);
    }
}

// Serve SP metadata dynamically
app.get('/metadata', (req, res) => {
    res.type('application/xml');
    res.send(sp.getMetadata());
});

app.get('/login', async (req, res) => {
    await loadIdpMetadata();
    const { id, context } = sp.createLoginRequest(idp, 'redirect');
    res.redirect(context);
});

app.post('/assert', async (req, res) => {
    await loadIdpMetadata();
    try {
        console.log('🔐 Processing SAML assertion...');
        console.log('📄 SAMLResponse length:', req.body.SAMLResponse?.length || 0);

        // Parse the SAML response with proper signature verification
        const result = await sp.parseLoginResponse(idp, 'post', req);

        console.log('✅ SAML assertion parsed successfully');
        console.log('📊 Parsed result keys:', Object.keys(result));
        console.log('🔍 Full result object:', JSON.stringify(result, null, 2));

        const extract = result.extract || result;
        console.log('📋 Extract object keys:', Object.keys(extract));
        console.log('📋 Full extract object:', JSON.stringify(extract, null, 2));

        // Try multiple ways to get attributes and nameID
        const attributes = extract.attributes || extract.attribute || result.attributes || result.attribute || {};
        const nameID = extract.nameID || extract.nameid || extract.subject || result.nameID || result.nameid || result.subject || 'Unknown';

        console.log('🎯 Final attributes:', JSON.stringify(attributes, null, 2));
        console.log('🎯 Final nameID:', nameID);

        // Return comprehensive JSON response for easy debugging
        const debugResponse = {
            success: true,
            message: "SAML assertion parsed successfully",
            samlResponseLength: req.body.SAMLResponse?.length || 0,
            relayState: req.body.RelayState,
            nameID: nameID,
            attributes: attributes,
            fullResult: result,
            extractObject: extract,
            resultKeys: Object.keys(result),
            extractKeys: Object.keys(extract),
            timestamp: new Date().toISOString()
        };

        res.json(debugResponse);
    } catch (err) {
        console.error('❌ SAML Assertion Error Details:', {
            message: err?.message,
            stack: err?.stack,
            fullError: err
        });

        const errorResponse = {
            success: false,
            message: "SAML assertion error",
            error: err?.message || err?.toString() || 'Unknown error',
            samlResponseLength: req.body.SAMLResponse?.length || 0,
            relayState: req.body.RelayState,
            timestamp: new Date().toISOString(),
            errorStack: err?.stack
        };

        res.status(500).json(errorResponse);
    }
});

app.get('/slo', (req, res) => {
    res.send('SP SLO endpoint');
});

// For demo: export SP metadata for IdP to consume (optional)
app.get('/export-metadata', (req, res) => {
    res.type('application/xml');
    res.send(sp.getMetadata());
});

app.listen(PORT, () => {
    console.log(`SP app listening on ${BASE_URL} (port ${PORT})`);
});