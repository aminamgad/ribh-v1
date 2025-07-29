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
- **Framework Preset**: Next.js
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`

### 3. Important Notes
- Socket.io is **disabled** in Vercel environment for compatibility
- The app will work without real-time features on Vercel
- For full functionality, consider using a different hosting provider

### 4. Database
Make sure your MongoDB database is accessible from Vercel's servers. You can use:
- MongoDB Atlas (recommended)
- Any MongoDB instance with public access

### 5. Common Issues

#### Issue: 500 Internal Server Error
**Solution**: 
1. Check that all environment variables are set
2. Ensure MongoDB connection string is correct
3. Check Vercel logs for specific errors

#### Issue: Build fails
**Solution**: 
1. Make sure all imports are correct
2. Check TypeScript errors
3. Ensure all dependencies are installed

#### Issue: Socket.io errors
**Solution**: Socket.io is automatically disabled in Vercel environment. This is normal.

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

### 8. Alternative Hosting
For full Socket.io functionality, consider:
- Railway
- Render
- DigitalOcean
- AWS

The project should now deploy successfully on Vercel! 