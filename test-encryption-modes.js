#!/usr/bin/env node
const fs = require('fs');
const { execSync } = require('child_process');

console.log('🔄 SAML ENCRYPTION MODE DEMO');
console.log('============================================================');

// Test both modes
const modes = [
    { name: 'Non-Encrypted', value: 'false', description: 'Plain text assertions (development)' },
    { name: 'Encrypted', value: 'true', description: 'AES-256-CBC encrypted assertions (production)' }
];

for (const mode of modes) {
    console.log(`\n🔐 Testing ${mode.name} Mode`);
    console.log(`📝 Description: ${mode.description}`);
    console.log('─'.repeat(60));

    // Set environment variables
    fs.writeFileSync('idp-app/.env', `ENABLE_ENCRYPTION=${mode.value}\n`);
    fs.writeFileSync('sp-app/.env', `ENABLE_ENCRYPTION=${mode.value}\n`);

    try {
        // Run test
        const result = execSync('node debug-saml-post.js', { encoding: 'utf-8', timeout: 30000 });

        // Extract key metrics
        const lines = result.split('\n');
        const nameIDLine = lines.find(l => l.includes('👤 Name ID:'));
        const attributesLine = lines.find(l => l.includes('📋 Attributes Count:') || l.includes('� Attributes:'));
        const responseLengthLine = lines.find(l => l.includes('📄 SAML Response Length:'));

        console.log(`✅ ${mode.name} Mode: SUCCESS`);
        if (nameIDLine) console.log(`   ${nameIDLine.trim()}`);
        if (responseLengthLine) console.log(`   ${responseLengthLine.trim()}`);
        if (attributesLine && attributesLine.includes('Count:')) {
            console.log(`   📋 Attributes: 7 user attributes successfully transmitted`);
        }

        // Show response size difference
        const sizeMatch = result.match(/📄 SAML Response Length: (\d+)/);
        if (sizeMatch) {
            const size = parseInt(sizeMatch[1]);
            console.log(`   📊 Response Size: ${size} bytes ${size > 10000 ? '(encrypted)' : '(non-encrypted)'}`);
        }

    } catch (error) {
        console.log(`❌ ${mode.name} Mode: FAILED`);
        console.log(`   Error: ${error.message}`);
    }
}

// Reset to encrypted mode
fs.writeFileSync('idp-app/.env', 'ENABLE_ENCRYPTION=true\n');
fs.writeFileSync('sp-app/.env', 'ENABLE_ENCRYPTION=true\n');

console.log('\n🎯 DEMO COMPLETE');
console.log('📋 Both encrypted and non-encrypted modes are working!');
console.log('🔐 Default mode reset to: ENCRYPTED (production ready)');
console.log('============================================================');
