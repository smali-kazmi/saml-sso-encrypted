# SAML SSO Implementation with Encrypted Assertions

A complete SAML Single Sign-On (SSO) implementation using Node.js with encrypted assertions, featuring both Identity Provider (IdP) and Service Provider (SP) applications.

## 🚀 Features

- ✅ **Complete SAML 2.0 SSO Flow** with proper signature verification
- ✅ **Encrypted Assertions** using AES-256-CBC encryption
- ✅ **Dynamic Metadata Loading** for real-time configuration synchronization
- ✅ **Custom User Attributes** (firstName, lastName, age, gender, email, username, displayName)
- ✅ **Comprehensive Testing Suite** with automated flow verification
- ✅ **JSON Debug Responses** for easy troubleshooting
- ✅ **Production-Ready Architecture**

## 📁 Project Structure

```
smal-encrypt/
├── idp-app/                    # Identity Provider Application
│   ├── app.js                  # IdP Express server
│   ├── idp.js                  # IdP SAML configuration
│   ├── constants.js            # IdP constants
│   ├── package.json            # IdP dependencies
│   ├── .env.sample             # IdP environment template
│   ├── idp-signing.cert        # IdP signing certificate
│   ├── idp-signing.key         # IdP signing private key
│   ├── idp-encrypt.cert        # IdP encryption certificate
│   └── idp-encrypt.key         # IdP encryption private key
├── sp-app/                     # Service Provider Application
│   ├── app.js                  # SP Express server
│   ├── sp.js                   # SP SAML configuration
│   ├── constants.js            # SP constants
│   ├── package.json            # SP dependencies
│   ├── .env.sample             # SP environment template
│   ├── sp-signing.cert         # SP signing certificate
│   ├── sp-signing.key          # SP signing private key
│   ├── sp-encrypt.cert         # SP encryption certificate
│   └── sp-encrypt.key          # SP encryption private key
├── test-scripts/               # Testing and debugging scripts
│   ├── complete-saml-test.js   # Comprehensive SAML flow test
│   ├── debug-saml-post.js      # SAML response debugging
│   └── decode-saml.js          # SAML response decoder
├── .gitignore                  # Git ignore rules
└── README.md                   # This file
```

## 🛠️ Prerequisites

- **Node.js** (v14 or higher)
- **npm** or **yarn**
- **OpenSSL** (for certificate generation)

## 📦 Installation

### 1. Clone and Install Dependencies

```bash
# Navigate to project directory
cd smal-encrypt

# Install IdP dependencies
cd idp-app
npm install
cd ..

# Install SP dependencies
cd sp-app
npm install
cd ..
```

### 2. Environment Configuration

```bash
# Copy environment templates
cp idp-app/.env.sample idp-app/.env
cp sp-app/.env.sample sp-app/.env

# Edit the .env files according to your setup
```

### 3. Generate SAML Certificates

**For IdP (Identity Provider):**
```bash
cd idp-app

# Generate signing key and certificate
openssl req -x509 -newkey rsa:2048 -keyout idp-signing.key -out idp-signing.cert -days 365 -nodes -subj "/CN=IdP Signing"

# Generate encryption key and certificate
openssl req -x509 -newkey rsa:2048 -keyout idp-encrypt.key -out idp-encrypt.cert -days 365 -nodes -subj "/CN=IdP Encryption"

cd ..
```

**For SP (Service Provider):**
```bash
cd sp-app

# Generate signing key and certificate
openssl req -x509 -newkey rsa:2048 -keyout sp-signing.key -out sp-signing.cert -days 365 -nodes -subj "/CN=SP Signing"

# Generate encryption key and certificate
openssl req -x509 -newkey rsa:2048 -keyout sp-encrypt.key -out sp-encrypt.cert -days 365 -nodes -subj "/CN=SP Encryption"

cd ..
```

## 🚀 Running the Applications

### Start Both Applications (Recommended)

```bash
# Terminal 1: Start IdP (Identity Provider)
cd idp-app
npm start
# IdP will run on http://localhost:3000

# Terminal 2: Start SP (Service Provider)
cd sp-app
npm start
# SP will run on http://localhost:4000
```

### Development Mode

```bash
# With nodemon for auto-restart on changes
cd idp-app
npx nodemon app.js

cd sp-app
npx nodemon app.js
```

## 🧪 Testing the SAML Flow

### Automated Testing (Recommended)

```bash
# Run comprehensive SAML flow test
node complete-saml-test.js

# Run specific debugging tests
node debug-saml-post.js
node decode-saml.js
```

### Manual Testing

1. **Access SP Login**: http://localhost:4000/login
2. **Follow SAML Redirect** to IdP
3. **Complete Authentication** at IdP
4. **Verify Attributes** in SP response

## 📋 API Endpoints

### Identity Provider (IdP) - Port 3000

- `GET /metadata` - IdP metadata endpoint
- `GET /sso` - Single Sign-On initiation
- `GET /` - IdP status page

### Service Provider (SP) - Port 4000

- `GET /metadata` - SP metadata endpoint
- `GET /login` - Initiate SAML authentication
- `POST /assert` - SAML assertion consumer (ACS)
- `GET /` - SP status page

## 🔧 Configuration

### IdP Configuration (`idp-app/idp.js`)

```javascript
const idp = saml.IdentityProvider({
    entityID: 'http://localhost:3000/metadata',
    privateKey: fs.readFileSync('./idp-signing.key'),
    signingCert: fs.readFileSync('./idp-signing.cert'),
    encPrivateKey: fs.readFileSync('./idp-encrypt.key'),
    isAssertionEncrypted: true,
    nameIDFormat: ['urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress'],
    // Custom template with user attributes
    loginResponseTemplate: { ... }
});
```

### SP Configuration (`sp-app/sp.js`)

```javascript
const sp = saml.ServiceProvider({
    entityID: 'http://localhost:4000/metadata',
    privateKey: fs.readFileSync('./sp-signing.key'),
    signingCert: fs.readFileSync('./sp-signing.cert'),
    encPrivateKey: fs.readFileSync('./sp-encrypt.key'),
    isAssertionEncrypted: true,
    // Dynamic IdP metadata loading
});
```

## 👤 User Attributes

The system supports the following user attributes in SAML assertions:

- `email` - User email address
- `displayName` - Full display name
- `firstName` - First name
- `lastName` - Last name
- `age` - User age
- `gender` - User gender
- `username` - Username/login

### Sample User Data

```javascript
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
```

## 🔒 Security Features

- **RSA-SHA256 Signature Verification**
- **AES-256-CBC Encrypted Assertions**
- **X509 Certificate Validation**
- **Dynamic Metadata Synchronization**
- **Proper SAML 2.0 Compliance**

## 🐛 Troubleshooting

### Common Issues

1. **Certificate Issues**
   ```bash
   # Regenerate certificates if needed
   openssl req -x509 -newkey rsa:2048 -keyout key.key -out cert.cert -days 365 -nodes
   ```

2. **Port Conflicts**
   ```bash
   # Check if ports are in use
   lsof -i :3000
   lsof -i :4000
   ```

3. **Metadata Loading Issues**
   - Ensure both applications are running
   - Check network connectivity between IdP and SP
   - Verify certificate paths in configuration

### Debug Mode

Enable detailed logging by setting in your `.env` files:
```bash
DEBUG_SAML=true
LOG_LEVEL=debug
```

### Testing Scripts

- `complete-saml-test.js` - Full flow verification with detailed output
- `debug-saml-post.js` - SAML response debugging with form data analysis
- `decode-saml.js` - Decode and analyze SAML XML responses

## 📊 Test Results

Successful test output should show:
```
🎉 SAML SSO AUTHENTICATION SUCCESSFUL!
👤 Name ID: user@example.com
📋 Attributes Count: 7
📋 USER ATTRIBUTES:
   email: user@example.com
   displayName: Demo User
   firstName: John
   lastName: Doe
   age: 30
   gender: Male
   username: johndoe
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- [samlify](https://github.com/tngan/samlify) - SAML 2.0 library for Node.js
- [Express.js](https://expressjs.com/) - Web framework
- [OpenSSL](https://www.openssl.org/) - Certificate generation

## 📞 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Run the automated test scripts
3. Enable debug mode for detailed logging
4. Review the SAML response XML structure

---

**Happy SAML SSO Implementation!** 🚀
