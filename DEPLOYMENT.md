# Deployment Guide

## Vercel Deployment

### 1. Environment Variables
Make sure to set these environment variables in your Vercel project:

```bash
MONGODB_URI=your-mongodb-connection-string
JWT_SECRET=your-super-secret-jwt-key
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
NODE_ENV=production
```

### 2. Build Settings
- **Framework Preset**: Node.js
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`

### 3. Custom Server
This project uses a custom server (`server.js`) for Socket.io support. The `vercel.json` file is configured to use this server.

### 4. Database
Make sure your MongoDB database is accessible from Vercel's servers. You can use:
- MongoDB Atlas (recommended)
- Any MongoDB instance with public access

### 5. Common Issues

#### Issue: Build fails with TypeScript errors
**Solution**: Make sure all imports are correct and all types are properly defined.

#### Issue: Socket.io not working
**Solution**: The custom server handles Socket.io. Make sure `vercel.json` is properly configured.

#### Issue: Database connection fails
**Solution**: Check your `MONGODB_URI` environment variable and ensure your database is accessible.

### 6. Local Testing
Before deploying, test locally:
```bash
npm run build
npm start
```

### 7. Deployment Steps
1. Push your code to GitHub
2. Connect your repository to Vercel
3. Set environment variables
4. Deploy

The project should now deploy successfully on Vercel! 