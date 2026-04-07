#!/usr/bin/env node
/**
 * Kai API Setup Wizard
 * Interactive guide for getting API keys
 * Usage: npx kai-api-setup
 */

const readline = require('readline');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const platforms = {
  youtube: {
    name: 'YouTube',
    difficulty: 'Easy',
    time: '5 minutes',
    steps: [
      {
        title: 'Open Google Cloud Console',
        action: 'url',
        url: 'https://console.cloud.google.com/apis/credentials',
        desc: 'We\'ll open the console in your browser. Sign in with your Google account.'
      },
      {
        title: 'Create a new project',
        action: 'input',
        prompt: 'Have you created a project? (yes/no/help): ',
        help: 'Click "Select a project" dropdown → "New Project" → Name it "My Social Analytics" → Click "Create"'
      },
      {
        title: 'Enable YouTube API',
        action: 'input',
        prompt: 'Have you enabled YouTube Data API v3? (yes/no/help): ',
        help: 'In the search bar, type "YouTube Data API v3" → Click on it → Click "Enable"'
      },
      {
        title: 'Create API Key',
        action: 'input',
        prompt: 'Have you created an API key? (yes/no/help): ',
        help: 'Go to "Credentials" in the left menu → Click "Create Credentials" → Choose "API Key"'
      },
      {
        title: 'Enter your API key',
        action: 'secret',
        envVar: 'YOUTUBE_API_KEY',
        prompt: 'Paste your API key here: ',
        validate: (key) => key.length > 20
      }
    ]
  },
  
  instagram: {
    name: 'Instagram',
    difficulty: 'Medium',
    time: '10 minutes',
    steps: [
      {
        title: 'Open Meta for Developers',
        action: 'url',
        url: 'https://developers.facebook.com/apps/',
        desc: 'Sign in with your Facebook account (must match your Instagram account)'
      },
      {
        title: 'Create an app',
        action: 'input',
        prompt: 'Have you created an app? (yes/no/help): ',
        help: 'Click "Create App" → Select "Other" → Enter "Social Analytics" as the name → Click "Create App"'
      },
      {
        title: 'Add Instagram product',
        action: 'input',
        prompt: 'Have you added Instagram Basic Display? (yes/no/help): ',
        help: 'In the left sidebar, find "Add Product" → Find "Instagram Basic Display" → Click "Set Up"'
      },
      {
        title: 'Add test user',
        action: 'input',
        prompt: 'Have you added your Instagram as a tester? (yes/no/help): ',
        help: 'Go to "Roles" → "Instagram Testers" → "Add Instagram Testers" → Enter your Instagram username → Submit'
      },
      {
        title: 'Accept invitation',
        action: 'input',
        prompt: 'Have you accepted the invitation in Instagram? (yes/no/help): ',
        help: 'Go to instagram.com → Settings → Apps and Websites → Tester Invites → Accept the invite'
      },
      {
        title: 'Generate token',
        action: 'input',
        prompt: 'Have you generated an access token? (yes/no/help): ',
        help: 'In the developer portal, go back to "Basic Display" → "User Token Generator" → Click "Generate Token"'
      },
      {
        title: 'Enter your token',
        action: 'secret',
        envVar: 'INSTAGRAM_TOKEN',
        prompt: 'Paste your access token here: ',
        validate: (token) => token.length > 50
      }
    ]
  },
  
  openrouter: {
    name: 'OpenRouter (AI)',
    difficulty: 'Easiest',
    time: '2 minutes',
    steps: [
      {
        title: 'Open OpenRouter',
        action: 'url',
        url: 'https://openrouter.ai/keys',
        desc: 'This is for AI image generation and chat completions'
      },
      {
        title: 'Sign up or log in',
        action: 'input',
        prompt: 'Have you signed in to OpenRouter? (yes/no): ',
        help: 'Click "Sign Up" and create an account with email or Google'
      },
      {
        title: 'Create API key',
        action: 'input',
        prompt: 'Have you created an API key? (yes/no/help): ',
        help: 'Click "Create API Key" → Name it "Kai" → Click "Create"'
      },
      {
        title: 'Enter your key',
        action: 'secret',
        envVar: 'OPENROUTER_API_KEY',
        prompt: 'Paste your API key here: ',
        validate: (key) => key.startsWith('sk-or-')
      }
    ]
  }
};

function question(prompt) {
  return new Promise(resolve => {
    rl.question(prompt, resolve);
  });
}

function openBrowser(url) {
  const platform = process.platform;
  const cmd = platform === 'darwin' ? 'open' : platform === 'win32' ? 'start' : 'xdg-open';
  exec(`${cmd} ${url}`);
}

async function runWizard(platformKey) {
  const platform = platforms[platformKey];
  
  console.log(`\n========================================`);
  console.log(`Setting up ${platform.name}`);
  console.log(`Difficulty: ${platform.difficulty} | Time: ${platform.time}`);
  console.log(`========================================\n`);
  
  const envVars = {};
  
  for (let i = 0; i < platform.steps.length; i++) {
    const step = platform.steps[i];
    console.log(`\nStep ${i + 1} of ${platform.steps.length}: ${step.title}`);
    console.log('-'.repeat(40));
    
    if (step.desc) {
      console.log(step.desc);
    }
    
    if (step.action === 'url') {
      console.log(`\nOpening browser to: ${step.url}`);
      openBrowser(step.url);
      await question('\nPress Enter when you\'re done...');
    }
    
    if (step.action === 'input') {
      let answer = '';
      while (answer !== 'yes') {
        answer = await question(step.prompt);
        if (answer === 'help') {
          console.log(`\n💡 ${step.help}`);
        } else if (answer === 'no') {
          console.log(`\nPlease complete this step first.`);
          if (step.help) {
            console.log(`\n💡 ${step.help}`);
          }
        } else if (answer !== 'yes') {
          console.log('\nPlease type "yes" when done, "no" to retry, or "help" for instructions.');
        }
      }
    }
    
    if (step.action === 'secret') {
      let valid = false;
      let value = '';
      
      while (!valid) {
        value = await question(step.prompt);
        
        if (step.validate && !step.validate(value)) {
          console.log('❌ That doesn\'t look right. Please check and try again.');
        } else {
          valid = true;
        }
      }
      
      envVars[step.envVar] = value;
      console.log('✅ Key saved!');
    }
  }
  
  // Save to .env file
  console.log('\n========================================');
  console.log('Saving your API keys...');
  console.log('========================================\n');
  
  const kaiDir = path.join(require('os').homedir(), '.kai');
  if (!fs.existsSync(kaiDir)) {
    fs.mkdirSync(kaiDir, { recursive: true });
  }
  
  const envPath = path.join(kaiDir, '.env');
  let envContent = '';
  
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf-8') + '\n';
  }
  
  for (const [key, value] of Object.entries(envVars)) {
    // Remove existing entry if present
    envContent = envContent.replace(new RegExp(`${key}=.*\n?`, 'g'), '');
    envContent += `${key}=${value}\n`;
  }
  
  fs.writeFileSync(envPath, envContent);
  
  console.log(`✅ API keys saved to: ${envPath}`);
  console.log('\nTo use them now, run:');
  console.log(`  export ${Object.keys(envVars)[0]}=${Object.values(envVars)[0]}`);
  console.log('\nOr restart your terminal to load them automatically.');
  console.log('\nYou can now use:');
  console.log(`  kai use ${platformKey} <action>`);
}

async function main() {
  console.log('========================================');
  console.log('Kai API Setup Wizard');
  console.log('========================================\n');
  console.log('This wizard will help you get API keys for social media platforms.\n');
  console.log('Available platforms:');
  
  const keys = Object.keys(platforms);
  keys.forEach((key, i) => {
    const p = platforms[key];
    console.log(`  ${i + 1}. ${p.name} (${p.difficulty}, ~${p.time})`);
  });
  
  console.log('\nOr type "all" to set up multiple platforms');
  
  const choice = await question('\nWhich platform? (number or name): ');
  
  let selected = '';
  const num = parseInt(choice);
  
  if (!isNaN(num) && num >= 1 && num <= keys.length) {
    selected = keys[num - 1];
  } else if (platforms[choice.toLowerCase()]) {
    selected = choice.toLowerCase();
  } else if (choice === 'all') {
    console.log('\nComing soon: Multi-platform setup');
    process.exit(0);
  } else {
    console.log('\n❌ Invalid choice. Please run again.');
    process.exit(1);
  }
  
  await runWizard(selected);
  
  rl.close();
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
