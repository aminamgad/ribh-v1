const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

console.log(`
${colors.bright}${colors.blue}
╔════════════════════════════════════════════╗
║   cPanel Deployment Preparation Tool       ║
╚════════════════════════════════════════════╝
${colors.reset}
`);

// Configuration
const DEPLOY_DIR = path.join(__dirname, '..', 'deploy-ribhstore');
const SOURCE_DIR = path.join(__dirname, '..');

console.log(`${colors.cyan}📦 Preparing files for cPanel deployment...${colors.reset}\n`);

// Create deployment directory
if (fs.existsSync(DEPLOY_DIR)) {
  console.log(`${colors.yellow}🗑️  Removing existing deployment directory...${colors.reset}`);
  fs.rmSync(DEPLOY_DIR, { recursive: true, force: true });
}

fs.mkdirSync(DEPLOY_DIR, { recursive: true });
console.log(`${colors.green}✅ Created deployment directory: ${DEPLOY_DIR}${colors.reset}\n`);

// Copy standalone build
console.log(`${colors.cyan}📋 Copying standalone build...${colors.reset}`);
if (fs.existsSync(path.join(SOURCE_DIR, '.next', 'standalone'))) {
  const standalonePath = path.join(SOURCE_DIR, '.next', 'standalone');
  const targetPath = path.join(DEPLOY_DIR, '.next');
  
  // Copy standalone directory
  copyDirectory(standalonePath, targetPath);
  console.log(`${colors.green}✅ Copied standalone build${colors.reset}`);
} else {
  console.log(`${colors.red}❌ Standalone build not found. Please run: npm run build${colors.reset}`);
  process.exit(1);
}

// Copy public directory
console.log(`${colors.cyan}📋 Copying public directory...${colors.reset}`);
if (fs.existsSync(path.join(SOURCE_DIR, 'public'))) {
  copyDirectory(path.join(SOURCE_DIR, 'public'), path.join(DEPLOY_DIR, 'public'));
  console.log(`${colors.green}✅ Copied public directory${colors.reset}`);
}

// Copy server.js
console.log(`${colors.cyan}📋 Copying server.js...${colors.reset}`);
if (fs.existsSync(path.join(SOURCE_DIR, 'server.js'))) {
  fs.copyFileSync(
    path.join(SOURCE_DIR, 'server.js'),
    path.join(DEPLOY_DIR, 'server.js')
  );
  console.log(`${colors.green}✅ Copied server.js${colors.reset}`);
}

// Create production package.json
console.log(`${colors.cyan}📋 Creating production package.json...${colors.reset}`);
const packageJson = JSON.parse(fs.readFileSync(path.join(SOURCE_DIR, 'package.json'), 'utf8'));
const productionPackageJson = {
  name: packageJson.name,
  version: packageJson.version,
  private: true,
  scripts: {
    start: 'node server.js'
  },
  dependencies: {
    'next': packageJson.dependencies.next,
    'react': packageJson.dependencies.react,
    'react-dom': packageJson.dependencies['react-dom'],
    'mongoose': packageJson.dependencies.mongoose,
    'jsonwebtoken': packageJson.dependencies.jsonwebtoken,
    'bcryptjs': packageJson.dependencies.bcryptjs,
    'cloudinary': packageJson.dependencies.cloudinary,
    'socket.io': packageJson.dependencies['socket.io'],
    'express': packageJson.dependencies.express,
    'dotenv': packageJson.dependencies.dotenv,
    'zod': packageJson.dependencies.zod,
    'joi': packageJson.dependencies.joi,
    'rate-limiter-flexible': packageJson.dependencies['rate-limiter-flexible'],
    'nodemailer': packageJson.dependencies.nodemailer,
    'xlsx': packageJson.dependencies.xlsx,
    'recharts': packageJson.dependencies.recharts,
    'react-hot-toast': packageJson.dependencies['react-hot-toast'],
    'react-hook-form': packageJson.dependencies['react-hook-form'],
    '@hookform/resolvers': packageJson.dependencies['@hookform/resolvers'],
    'lucide-react': packageJson.dependencies['lucide-react'],
    'clsx': packageJson.dependencies.clsx,
    'tailwind-merge': packageJson.dependencies['tailwind-merge'],
    'class-variance-authority': packageJson.dependencies['class-variance-authority'],
    '@radix-ui/react-label': packageJson.dependencies['@radix-ui/react-label'],
    '@radix-ui/react-slot': packageJson.dependencies['@radix-ui/react-slot'],
    'compression': packageJson.dependencies.compression,
    'cors': packageJson.dependencies.cors,
    'helmet': packageJson.dependencies.helmet,
    'morgan': packageJson.dependencies.morgan,
    'multer': packageJson.dependencies.multer
  },
  engines: {
    node: '>=18.0.0',
    npm: '>=9.0.0'
  }
};

fs.writeFileSync(
  path.join(DEPLOY_DIR, 'package.json'),
  JSON.stringify(productionPackageJson, null, 2),
  'utf8'
);
console.log(`${colors.green}✅ Created production package.json${colors.reset}`);

// Create .htaccess for cPanel
console.log(`${colors.cyan}📋 Creating .htaccess...${colors.reset}`);
const htaccessContent = `# Next.js Configuration for /ribhstore
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /ribhstore/
  
  # Handle Next.js API routes
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule ^api/(.*)$ /ribhstore/.next/server/app/api/$1 [L]
  
  # Handle Next.js pages
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule ^(.*)$ /ribhstore/.next/server/pages/$1 [L]
</IfModule>

# Security Headers
<IfModule mod_headers.c>
  Header set X-Frame-Options "DENY"
  Header set X-Content-Type-Options "nosniff"
  Header set Referrer-Policy "origin-when-cross-origin"
</IfModule>

# Enable Compression
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript application/json
</IfModule>
`;

fs.writeFileSync(path.join(DEPLOY_DIR, '.htaccess'), htaccessContent, 'utf8');
console.log(`${colors.green}✅ Created .htaccess${colors.reset}`);

// Create .env.example
console.log(`${colors.cyan}📋 Creating .env.example...${colors.reset}`);
const envExample = `# Database Configuration
MONGODB_URI=your_mongodb_connection_string

# JWT Secret
JWT_SECRET=your_jwt_secret_key

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Application URL (Update this!)
NEXT_PUBLIC_APP_URL=https://portfolio.roeia.com/ribhstore
NODE_ENV=production
PORT=3000
`;

fs.writeFileSync(path.join(DEPLOY_DIR, '.env.example'), envExample, 'utf8');
console.log(`${colors.green}✅ Created .env.example${colors.reset}`);

// Create deployment instructions
console.log(`${colors.cyan}📋 Creating deployment instructions...${colors.reset}`);
const instructions = `# تعليمات الرفع على cPanel

## الملفات جاهزة في: ${DEPLOY_DIR}

## خطوات الرفع:

### 1. رفع الملفات عبر FTP
- استخدم FileZilla أو أي عميل FTP
- ارفع جميع محتويات مجلد deploy-ribhstore إلى:
  /home/portfolioroeia/public_html/ribhstore/

### 2. إعداد Node.js في cPanel
1. اذهب إلى "Node.js Selector" في cPanel
2. أنشئ تطبيق جديد:
   - Node.js Version: 18.x أو أحدث
   - Application Root: /home/portfolioroeia/public_html/ribhstore
   - Application URL: /ribhstore
   - Application Startup File: server.js
   - Application Mode: Production

### 3. إعداد متغيرات البيئة
في Node.js Selector، أضف متغيرات البيئة:
- MONGODB_URI
- JWT_SECRET
- CLOUDINARY_CLOUD_NAME
- CLOUDINARY_API_KEY
- CLOUDINARY_API_SECRET
- NEXT_PUBLIC_APP_URL=https://portfolio.roeia.com/ribhstore
- NODE_ENV=production
- PORT=3000

### 4. تثبيت المتطلبات
في Terminal (SSH) أو cPanel Terminal:
\`\`\`bash
cd ~/public_html/ribhstore
npm install --production
\`\`\`

### 5. تشغيل التطبيق
من Node.js Selector:
- انقر على "Restart" للتطبيق

### 6. التحقق
افتح: https://portfolio.roeia.com/ribhstore
`;

fs.writeFileSync(path.join(DEPLOY_DIR, 'DEPLOY_INSTRUCTIONS.txt'), instructions, 'utf8');
console.log(`${colors.green}✅ Created deployment instructions${colors.reset}`);

// Helper function to copy directory
function copyDirectory(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

console.log(`\n${colors.bright}${colors.green}✅ Deployment package ready!${colors.reset}\n`);
console.log(`${colors.bright}Location: ${DEPLOY_DIR}${colors.reset}\n`);
console.log(`${colors.cyan}Next steps:${colors.reset}`);
console.log(`1. Review files in: ${DEPLOY_DIR}`);
console.log(`2. Upload to cPanel via FTP`);
console.log(`3. Follow instructions in: ${DEPLOY_DIR}/DEPLOY_INSTRUCTIONS.txt\n`);


