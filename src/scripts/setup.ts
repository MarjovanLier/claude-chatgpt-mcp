#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Setup script to initialize the .env file from the example
 */
async function setupEnvironment() {
  try {
    const projectRoot = path.resolve(__dirname, '..', '..');
    const envExamplePath = path.join(projectRoot, '.env.example');
    const envPath = path.join(projectRoot, '.env');
    
    // Check if .env already exists
    if (fs.existsSync(envPath)) {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      const answer = await new Promise<string>((resolve) => {
        rl.question('.env file already exists. Overwrite? (y/N): ', resolve);
      });
      
      rl.close();
      
      if (answer.toLowerCase() !== 'y') {
        console.log('Setup cancelled. Existing .env file preserved.');
        return;
      }
    }
    
    // Read the example file
    const exampleContent = fs.readFileSync(envExamplePath, 'utf8');
    
    // Copy to .env with interactive configuration
    fs.writeFileSync(envPath, exampleContent);
    
    console.log('\nEnvironment file created successfully at:', envPath);
    console.log('Edit this file to customize your configuration.');
    console.log('\nDefault configuration:');
    console.log('- Debug mode: disabled');
    console.log('- Log to file: disabled');
    console.log('- Standard operation timeout: 2 minutes');
    console.log('- Search operation timeout: 10 minutes');
    console.log('\nTo enable debug mode, set DEBUG=true in your .env file.');
  } catch (error) {
    console.error('Error during setup:', error);
  }
}

// Run the setup
setupEnvironment();