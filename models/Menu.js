// ============================================
// 2. MENU MODEL (models/Menu.js)
// ============================================
const menuSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Menu item name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: ['starters', 'main-course', 'desserts', 'beverages', 'special'],
      lowercase: true,
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    image: {
      type: String,
      default: 'https://via.placeholder.com/300x200?text=Food+Item',
    },
    isVeg: {
      type: Boolean,
      default: true,
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    preparationTime: {
      type: Number,
      default: 15,
      min: [5, 'Preparation time must be at least 5 minutes'],
    },
    tags: [
      {
        type: String,
        lowercase: true,
      }
    ],
    ingredients: [String],
    nutritionInfo: {
      calories: Number,
      protein: Number,
      carbs: Number,
      fat: Number,
    },
    rating: {
      average: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
      },
      count: {
        type: Number,
        default: 0,
      },
    },
    // GST Info
    gstRate: {
      type: Number,
      default: 5, // 5% GST on food items
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

menuSchema.index({ category: 1, isAvailable: 1 });
menuSchema.index({ name: 'text', description: 'text' });

menuSchema.pre(/^find/, function () {
  const opts = this._mongooseOptions;
  if (!opts || !opts.includeDeleted) {
    this.find({ isDeleted: { $ne: true } });
  }
});

module.exports = mongoose.model('Menu', menuSchema);