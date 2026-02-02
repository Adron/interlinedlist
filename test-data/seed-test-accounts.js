#!/usr/bin/env node

/**
 * Seed script to add test accounts and messages to the localhost development database
 * 
 * This script reads test-accounts.json and creates:
 * - User accounts with hashed passwords and GitHub avatar URLs
 * - Test messages for each user (10-50 messages per user)
 * - Messages with varied timestamps, visibility, and ~15% containing links
 */

const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✓ ${message}`, 'green');
}

function logError(message) {
  log(`✗ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠ ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ ${message}`, 'blue');
}

function logProgress(message) {
  log(message, 'cyan');
}

/**
 * Hash a password using bcrypt
 */
async function hashPassword(password) {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

/**
 * Load test accounts from JSON file
 */
function loadTestAccounts() {
  const filePath = path.join(__dirname, 'test-accounts.json');
  
  if (!fs.existsSync(filePath)) {
    throw new Error(`Test accounts file not found: ${filePath}`);
  }

  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const accounts = JSON.parse(fileContent);

  if (!Array.isArray(accounts) || accounts.length === 0) {
    throw new Error('Test accounts file must contain a non-empty array');
  }

  return accounts;
}

/**
 * Check if a user already exists by username or email
 */
async function userExists(prisma, username, email) {
  const existing = await prisma.user.findFirst({
    where: {
      OR: [
        { username },
        { email },
      ],
    },
    select: {
      id: true,
      username: true,
      email: true,
    },
  });

  return existing;
}

/**
 * Generate a random alphanumeric string for link IDs
 */
function generateRandomId(length = 11) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generate a link URL for a specific platform
 */
function generateLinkUrl(platform) {
  const randomId = generateRandomId();
  const randomIdShort = generateRandomId(8);
  const username = `user${Math.floor(Math.random() * 1000)}`;
  
  switch (platform) {
    case 'instagram':
      const instagramTypes = ['p', 'reel', 'tv'];
      const type = instagramTypes[Math.floor(Math.random() * instagramTypes.length)];
      return `https://www.instagram.com/${type}/${randomId}/`;
    
    case 'bluesky':
      return `https://bsky.app/profile/${username}.bsky.social/post/3k${randomId}`;
    
    case 'threads':
      return `https://www.threads.net/@${username}/post/${randomId}`;
    
    case 'mastodon':
      const instances = ['mastodon.social', 'mastodon.online', 'mastodon.xyz'];
      const instance = instances[Math.floor(Math.random() * instances.length)];
      return `https://${instance}/@${username}/${Math.floor(Math.random() * 1000000)}`;
    
    default:
      // Other web links
      const otherTypes = [
        `https://github.com/${username}/repo-${randomIdShort}`,
        `https://medium.com/@${username}/article-${randomIdShort}`,
        `https://twitter.com/${username}/status/${Math.floor(Math.random() * 10000000000)}`,
        `https://example.com/article/${randomIdShort}`,
        `https://dev.to/${username}/post-${randomIdShort}`,
        `https://www.youtube.com/watch?v=${randomId}`,
      ];
      return otherTypes[Math.floor(Math.random() * otherTypes.length)];
  }
}

/**
 * Generate realistic message content based on user's profession/bio
 */
function generateMessageContent(user, hasLink = false) {
  const bio = user.bio || '';
  const displayName = user.displayName || user.username;
  
  // Extract profession/keywords from bio
  const isDeveloper = /developer|engineer|programmer|coding|software|full.?stack|backend|frontend|fullstack/i.test(bio);
  const isDesigner = /designer|design|ux|ui|visual|graphic/i.test(bio);
  const isManager = /manager|product|pm|lead|director/i.test(bio);
  const isData = /data|scientist|analyst|ml|ai|machine learning/i.test(bio);
  const isDevOps = /devops|sre|infrastructure|cloud|kubernetes|aws/i.test(bio);
  const isMarketing = /marketing|growth|content|social media/i.test(bio);
  
  // Message templates based on profession
  const templates = [];
  
  if (isDeveloper) {
    templates.push(
      "Just shipped a new feature! Excited to see how users respond.",
      "Refactoring legacy code is always satisfying when it's done right.",
      "Spent the day debugging a tricky race condition. Finally got it!",
      "New framework release looks promising. Time to experiment.",
      "Code review culture is so important for maintaining quality.",
      "Pair programming session was super productive today.",
      "Documentation is code too. Don't skip it!",
      "Performance optimization work is paying off.",
      "Open source contributions are so rewarding.",
      "Learning a new language is always refreshing.",
      "The best code is code you don't have to write.",
      "Testing is not optional. It's part of the development process.",
      "Code that works is not the same as code that's maintainable.",
      "Architecture decisions have long-term consequences.",
      "Clean code is not about perfection, it's about clarity."
    );
  }
  
  if (isDesigner) {
    templates.push(
      "Working on a new design system. Consistency is key.",
      "User research insights are shaping our next iteration.",
      "Accessibility should be built in, not bolted on.",
      "Design is not just how it looks, it's how it works.",
      "Prototyping helps catch issues before development.",
      "Color theory in practice is fascinating.",
      "Typography makes or breaks a design.",
      "User testing revealed some unexpected behaviors.",
      "Design systems save so much time in the long run.",
      "The best designs are invisible to the user.",
      "Sketching ideas before jumping into tools.",
      "Design critique sessions are invaluable.",
      "Micro-interactions add so much polish.",
      "Responsive design is more than just breakpoints.",
      "Designing for accessibility benefits everyone."
    );
  }
  
  if (isManager) {
    templates.push(
      "Team retrospective was insightful. Always learning.",
      "Product roadmap planning is in full swing.",
      "Stakeholder alignment is crucial for success.",
      "Metrics don't tell the whole story, but they help.",
      "Clear communication prevents so many issues.",
      "Empowering the team leads to better outcomes.",
      "Prioritization is an ongoing challenge.",
      "User feedback is guiding our decisions.",
      "Cross-functional collaboration is key.",
      "Building trust takes time but pays off.",
      "Strategy without execution is just a wish.",
      "Leading by example matters more than words.",
      "Celebrating small wins keeps momentum going.",
      "Transparency builds stronger teams.",
      "Feedback is a gift, even when it's hard to hear."
    );
  }
  
  if (isData) {
    templates.push(
      "Data quality is everything. Garbage in, garbage out.",
      "New ML model is showing promising results.",
      "Data visualization tells stories numbers alone can't.",
      "Feature engineering is an art form.",
      "A/B testing results are in. Interesting findings!",
      "Data pipeline optimization is ongoing work.",
      "Statistical significance vs practical significance.",
      "Working with messy real-world data is challenging.",
      "Model interpretability is crucial for trust.",
      "Data ethics should be considered from day one.",
      "Exploratory data analysis reveals hidden patterns.",
      "Feature selection makes all the difference.",
      "Cross-validation prevents overfitting.",
      "Data storytelling is a skill worth developing.",
      "The best models are simple and interpretable."
    );
  }
  
  if (isDevOps) {
    templates.push(
      "Infrastructure as code is a game changer.",
      "Monitoring and alerting setup is critical.",
      "CI/CD pipeline improvements are paying off.",
      "Container orchestration is complex but powerful.",
      "Disaster recovery planning is never fun but necessary.",
      "Cloud cost optimization is an ongoing effort.",
      "Security should be built into the pipeline.",
      "Automation reduces toil and human error.",
      "Observability > monitoring.",
      "Infrastructure reliability is a team effort.",
      "Blue-green deployments reduce risk.",
      "Configuration management is key to consistency.",
      "Performance testing catches issues early.",
      "Documentation for ops is just as important as code docs.",
      "Incident response processes save time when things break."
    );
  }
  
  if (isMarketing) {
    templates.push(
      "Content strategy is evolving based on analytics.",
      "A/B testing different messaging approaches.",
      "Social media engagement is up this month.",
      "Brand consistency across channels matters.",
      "Customer feedback is shaping our campaigns.",
      "SEO optimization is a long-term game.",
      "Email campaigns are performing well.",
      "Community building takes time but is worth it.",
      "Storytelling connects with audiences.",
      "Data-driven marketing decisions are key.",
      "Authenticity resonates more than polished perfection.",
      "Multi-channel approach increases reach.",
      "Conversion optimization is ongoing work.",
      "Building brand awareness takes patience.",
      "Customer journey mapping reveals opportunities."
    );
  }
  
  // Generic templates if profession not detected
  if (templates.length === 0) {
    templates.push(
      "Working on something exciting. More details soon!",
      "Great collaboration session today.",
      "Learning something new every day.",
      "Progress feels slow but steady.",
      "Team meeting was productive.",
      "New project is taking shape.",
      "Feedback received and incorporated.",
      "Iteration is key to improvement.",
      "Small steps lead to big changes.",
      "Focusing on what matters most.",
      "Building something meaningful.",
      "Challenges lead to growth.",
      "Celebrating progress, not just perfection.",
      "Process improvements are paying off.",
      "Working smarter, not just harder."
    );
  }
  
  // Select a random template
  let content = templates[Math.floor(Math.random() * templates.length)];
  
  // Add link if requested
  if (hasLink) {
    const platforms = ['instagram', 'bluesky', 'threads', 'mastodon', 'other'];
    const platform = platforms[Math.floor(Math.random() * platforms.length)];
    const linkUrl = generateLinkUrl(platform);
    
    // Add link naturally in the message
    const linkPhrases = [
      ` Check this out: ${linkUrl}`,
      ` More here: ${linkUrl}`,
      ` ${linkUrl}`,
      ` See: ${linkUrl}`,
      ` Link: ${linkUrl}`,
      `\n\n${linkUrl}`,
    ];
    content += linkPhrases[Math.floor(Math.random() * linkPhrases.length)];
  }
  
  return content;
}

/**
 * Create messages for a single user
 */
async function createMessagesForUser(prisma, user, messageCount) {
  const messages = [];
  const now = Date.now();
  const sixMonthsAgo = now - (180 * 24 * 60 * 60 * 1000); // 180 days in milliseconds
  
  // Calculate how many messages should have links (~15%)
  const linkMessageCount = Math.floor(messageCount * 0.15);
  const linkIndices = new Set();
  
  // Randomly select which messages will have links
  while (linkIndices.size < linkMessageCount) {
    linkIndices.add(Math.floor(Math.random() * messageCount));
  }
  
  // Generate messages with varied timestamps
  for (let i = 0; i < messageCount; i++) {
    // Spread timestamps over the past 6 months
    // Older messages first (chronological order)
    const daysAgo = (messageCount - i - 1) * (180 / messageCount) + Math.random() * (180 / messageCount);
    const timestamp = new Date(now - (daysAgo * 24 * 60 * 60 * 1000));
    
    const hasLink = linkIndices.has(i);
    const content = generateMessageContent(user, hasLink);
    
    // ~80% public, ~20% private
    const publiclyVisible = Math.random() > 0.2;
    
    messages.push({
      content,
      publiclyVisible,
      userId: user.id,
      linkMetadata: null,
      createdAt: timestamp,
    });
  }
  
  // Create messages in chronological order (oldest first)
  const createdMessages = [];
  for (const messageData of messages) {
    try {
      const message = await prisma.message.create({
        data: messageData,
      });
      createdMessages.push(message);
    } catch (error) {
      // Log error but continue
      console.error(`Failed to create message for user ${user.username}:`, error.message);
    }
  }
  
  return createdMessages;
}

/**
 * Create a single user account
 */
async function createAccount(prisma, accountData) {
  const { username, email, displayName, bio, avatar, password, emailVerified } = accountData;

  // Check if user already exists
  const existing = await userExists(prisma, username, email);
  if (existing) {
    return {
      success: false,
      skipped: true,
      username,
      reason: existing.username === username 
        ? `Username '${username}' already exists`
        : `Email '${email}' already exists`,
    };
  }

  // Hash password
  const passwordHash = await hashPassword(password);

  // Create user
  try {
    const user = await prisma.user.create({
      data: {
        username,
        email,
        passwordHash,
        displayName: displayName || username,
        bio: bio || null,
        avatar: avatar || null,
        emailVerified: emailVerified !== undefined ? emailVerified : true,
      },
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
      },
    });

    return {
      success: true,
      skipped: false,
      username,
      user,
    };
  } catch (error) {
    return {
      success: false,
      skipped: false,
      username,
      error: error.message,
    };
  }
}

/**
 * Main function
 */
async function main() {
  log('\n==========================================', 'cyan');
  log('Test Accounts Seeder', 'cyan');
  log('==========================================\n', 'cyan');

  // Load test accounts
  logInfo('Loading test accounts from test-accounts.json...');
  let accounts;
  try {
    accounts = loadTestAccounts();
    logSuccess(`Loaded ${accounts.length} test accounts`);
  } catch (error) {
    logError(`Failed to load test accounts: ${error.message}`);
    process.exit(1);
  }

  // Initialize Prisma client
  logInfo('Connecting to database...');
  const prisma = new PrismaClient({
    log: ['error', 'warn'],
  });

  try {
    // Test database connection
    await prisma.$connect();
    logSuccess('Database connection established');

    // Process accounts
    logInfo(`\nProcessing ${accounts.length} accounts...\n`);
    
    const results = {
      created: [],
      skipped: [],
      errors: [],
    };

    for (let i = 0; i < accounts.length; i++) {
      const account = accounts[i];
      const accountNum = i + 1;
      
      logProgress(`[${accountNum}/${accounts.length}] Processing ${account.username}...`);

      const result = await createAccount(prisma, account);

      if (result.success) {
        results.created.push(result);
        logSuccess(`  Created: ${result.user.displayName} (${result.user.email})`);
      } else if (result.skipped) {
        results.skipped.push(result);
        logWarning(`  Skipped: ${result.reason}`);
      } else {
        results.errors.push(result);
        logError(`  Error: ${result.error}`);
      }
    }

    // Print summary
    log('\n==========================================', 'cyan');
    log('Summary', 'cyan');
    log('==========================================\n', 'cyan');
    
    logSuccess(`Created: ${results.created.length} accounts`);
    if (results.skipped.length > 0) {
      logWarning(`Skipped: ${results.skipped.length} accounts (already exist)`);
    }
    if (results.errors.length > 0) {
      logError(`Errors: ${results.errors.length} accounts`);
      
      log('\nFailed accounts:', 'red');
      results.errors.forEach((error) => {
        log(`  - ${error.username}: ${error.error}`, 'red');
      });
    }

    log('\n==========================================', 'cyan');
    log('Default Password', 'cyan');
    log('==========================================\n', 'cyan');
    logInfo('All test accounts use the password: TestAccount123!');
    logInfo('All accounts are marked as email verified for easy testing.\n');

    // Create messages for successfully created users
    if (results.created.length > 0) {
      log('\n==========================================', 'cyan');
      log('Creating Test Messages', 'cyan');
      log('==========================================\n', 'cyan');
      
      logInfo(`Creating messages for ${results.created.length} users...\n`);
      
      const messageResults = {
        totalMessages: 0,
        messagesWithLinks: 0,
        errors: 0,
      };
      
      for (let i = 0; i < results.created.length; i++) {
        const userResult = results.created[i];
        const userNum = i + 1;
        
        // Get full user data from database
        const user = await prisma.user.findUnique({
          where: { id: userResult.user.id },
          select: {
            id: true,
            username: true,
            displayName: true,
            bio: true,
          },
        });
        
        if (!user) {
          logWarning(`[${userNum}/${results.created.length}] User ${userResult.username} not found, skipping messages`);
          continue;
        }
        
        // Generate random message count between 10-50
        const messageCount = Math.floor(Math.random() * 41) + 10;
        const linkCount = Math.floor(messageCount * 0.15);
        
        logProgress(`[${userNum}/${results.created.length}] Creating ${messageCount} messages for ${user.displayName || user.username}...`);
        
        try {
          const createdMessages = await createMessagesForUser(prisma, user, messageCount);
          messageResults.totalMessages += createdMessages.length;
          messageResults.messagesWithLinks += linkCount;
          logSuccess(`  Created ${createdMessages.length} messages (${linkCount} with links)`);
        } catch (error) {
          messageResults.errors++;
          logError(`  Error creating messages: ${error.message}`);
        }
      }
      
      // Print message creation summary
      log('\n==========================================', 'cyan');
      log('Message Creation Summary', 'cyan');
      log('==========================================\n', 'cyan');
      
      logSuccess(`Total messages created: ${messageResults.totalMessages}`);
      logInfo(`Messages with links: ~${messageResults.messagesWithLinks} (~15%)`);
      if (messageResults.errors > 0) {
        logWarning(`Errors: ${messageResults.errors} users`);
      }
      logInfo('Messages are spread over the past 6 months');
      logInfo('Mix of public and private messages (~80% public, ~20% private)\n');
    }

  } catch (error) {
    logError(`Database error: ${error.message}`);
    if (error.stack) {
      logError(error.stack);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    logSuccess('Database connection closed');
  }
}

// Run the script
main().catch((error) => {
  logError(`Unexpected error: ${error.message}`);
  if (error.stack) {
    logError(error.stack);
  }
  process.exit(1);
});
