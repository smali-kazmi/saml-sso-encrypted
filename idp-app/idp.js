const saml = require('samlify');
const fs = require('fs');
const axios = require('axios');

// Set library configurations
saml.setSchemaValidator({
    validate: () => true
});

// Function to dynamically load SP metadata from URL
async function createSPFromURL() {
    try {
        console.log('Fetching SP metadata from http://localhost:4000/metadata...');
        const response = await axios.get('http://localhost:4000/metadata');
        console.log('SP metadata fetched successfully');

        return saml.ServiceProvider({
            metadata: response.data,
            // Disable signature verification for debugging
            wantAssertionsSigned: false,
            wantResponseSigned: false
        });
    } catch (error) {
        console.error('Failed to fetch SP metadata:', error.message);
        // Fallback to local file
        console.log('Falling back to local sp_metadata.xml file...');
        return saml.ServiceProvider({
            metadata: fs.readFileSync('./sp_metadata.xml', 'utf8'),
            wantAssertionsSigned: false,
            wantResponseSigned: false
        });
    }
}

const idp = saml.IdentityProvider({
    entityID: 'http://localhost:3000/metadata',
    privateKey: fs.readFileSync('./idp-signing.key'),
    signingCert: fs.readFileSync('./idp-signing.cert'),
    encPrivateKey: fs.readFileSync('./idp-encrypt.key'),
    requestSignatureAlgorithm: 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256',
    nameIDFormat: ['urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress'],
    singleSignOnService: [{
        Binding: 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect',
        Location: 'http://localhost:3000/sso'
    }],
    isAssertionEncrypted: true,
    // Custom template for attributes
    loginResponseTemplate: {
        context: `
        <samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion" ID="{ID}" Version="2.0" IssueInstant="{IssueInstant}" Destination="{Destination}" InResponseTo="{InResponseTo}">
            <saml:Issuer>{Issuer}</saml:Issuer>
            <samlp:Status>
                <samlp:StatusCode Value="urn:oasis:names:tc:SAML:2.0:status:Success"/>
            </samlp:Status>
            <saml:Assertion xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xs="http://www.w3.org/2001/XMLSchema" ID="{AssertionID}" Version="2.0" IssueInstant="{IssueInstant}">
                <saml:Issuer>{Issuer}</saml:Issuer>
                <saml:Subject>
                    <saml:NameID Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress">{NameID}</saml:NameID>
                    <saml:SubjectConfirmation Method="urn:oasis:names:tc:SAML:2.0:cm:bearer">
                        <saml:SubjectConfirmationData NotOnOrAfter="{NotOnOrAfter}" Recipient="{SubjectRecipient}" InResponseTo="{InResponseTo}"/>
                    </saml:SubjectConfirmation>
                </saml:Subject>
                <saml:Conditions NotBefore="{NotBefore}" NotOnOrAfter="{NotOnOrAfter}">
                    <saml:AudienceRestriction>
                        <saml:Audience>{Audience}</saml:Audience>
                    </saml:AudienceRestriction>
                </saml:Conditions>
                <saml:AttributeStatement>
                    <saml:Attribute Name="email" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:basic">
                        <saml:AttributeValue xsi:type="xs:string">{email}</saml:AttributeValue>
                    </saml:Attribute>
                    <saml:Attribute Name="displayName" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:basic">
                        <saml:AttributeValue xsi:type="xs:string">{displayName}</saml:AttributeValue>
                    </saml:Attribute>
                    <saml:Attribute Name="firstName" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:basic">
                        <saml:AttributeValue xsi:type="xs:string">{firstName}</saml:AttributeValue>
                    </saml:Attribute>
                    <saml:Attribute Name="lastName" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:basic">
                        <saml:AttributeValue xsi:type="xs:string">{lastName}</saml:AttributeValue>
                    </saml:Attribute>
                    <saml:Attribute Name="age" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:basic">
                        <saml:AttributeValue xsi:type="xs:string">{age}</saml:AttributeValue>
                    </saml:Attribute>
                    <saml:Attribute Name="gender" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:basic">
                        <saml:AttributeValue xsi:type="xs:string">{gender}</saml:AttributeValue>
                    </saml:Attribute>
                    <saml:Attribute Name="username" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:basic">
                        <saml:AttributeValue xsi:type="xs:string">{username}</saml:AttributeValue>
                    </saml:Attribute>
                </saml:AttributeStatement>
                <saml:AuthnStatement AuthnInstant="{IssueInstant}" SessionIndex="_be9967abd904ddcae3c0eb4189adbe3f71e327cf93">
                    <saml:AuthnContext>
                        <saml:AuthnContextClassRef>urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport</saml:AuthnContextClassRef>
                    </saml:AuthnContext>
                </saml:AuthnStatement>
            </saml:Assertion>
        </samlp:Response>`
    }
});

module.exports = { idp, createSPFromURL };