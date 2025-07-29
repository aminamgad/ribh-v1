import mongoose, { Schema, Document } from 'mongoose';

export interface Favorite extends Document {
  userId: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  addedAt: Date;
}

const favoriteSchema = new Schema<Favorite>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  productId: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  addedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
favoriteSchema.index({ userId: 1, productId: 1 }, { unique: true });
favoriteSchema.index({ userId: 1, addedAt: -1 });

// Static method to get user favorites
favoriteSchema.statics.getUserFavorites = function(userId: string) {
  return this.find({ userId })
    .populate('productId')
    .sort({ addedAt: -1 });
};

// Static method to check if product is favorited
favoriteSchema.statics.isFavorite = async function(userId: string, productId: string) {
  const favorite = await this.findOne({ userId, productId });
  return !!favorite;
};

// Static method to toggle favorite
favoriteSchema.statics.toggleFavorite = async function(userId: string, productId: string) {
  const existing = await this.findOne({ userId, productId });
  
  if (existing) {
    await existing.deleteOne();
    return { added: false };
  } else {
    await this.create({ userId, productId });
    return { added: true };
  }
};

export default mongoose.models.Favorite || mongoose.model<Favorite>('Favorite', favoriteSchema); 